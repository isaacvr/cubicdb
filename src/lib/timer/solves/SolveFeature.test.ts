import { describe, expect, it, vi } from "vitest";
import { Penalty, type Solve } from "@interfaces";
import { Err, Ok } from "$lib/core/domain/Result";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createSolveFeature } from "./SolveFeature";
import { SolvePersistenceService, type SolvePersistencePort } from "./SolvePersistenceService";

function solve(overrides: Partial<Solve> = {}): Solve {
  return {
    _id: "solve:one",
    session: "session:one",
    time: 1000,
    date: 1,
    scramble: "R U",
    penalty: Penalty.NONE,
    selected: false,
    ...overrides,
  };
}

function setup(portOverrides: Partial<SolvePersistencePort> = {}) {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 1 }, { next: () => `event-${++id}` });
  const port: SolvePersistencePort = {
    loadSolves: vi.fn(async () => [solve(), solve({ _id: "foreign", session: "session:two" })]),
    addSolve: vi.fn(async draft => solve({ ...draft, _id: "added" })),
    updateSolve: vi.fn(async updated => ({ previousSolve: solve(), solve: updated })),
    removeSolves: vi.fn(async solves => solves),
    ...portOverrides,
  };
  const persistence = new SolvePersistenceService(bus, events, port);
  const feature = createSolveFeature({
    bus,
    events,
    ownerId: "timer:one",
    sessionId: "session:one",
  });
  return { bus, events, port, persistence, feature };
}

describe("SolveFeature", () => {
  it("loads and mutates only its session through correlated results", async () => {
    const { feature, persistence } = setup();

    await expect(feature.load()).resolves.toEqual(Ok(undefined));
    expect(feature.items.map(item => item._id)).toEqual(["solve:one"]);
    expect(feature.solves.map(item => item._id)).toEqual(["solve:one"]);

    const added = await feature.add({ time: 800 });
    expect(added).toMatchObject({ ok: true, value: { _id: "added", session: "session:one" } });
    expect(feature.items[0]._id).toBe("added");

    const updated = solve({ time: 750 });
    await expect(feature.update(updated)).resolves.toEqual(Ok(updated));
    await expect(feature.remove([updated])).resolves.toEqual(Ok([updated]));
    persistence.destroy();
  });

  it("owns solve selection state and removes selected solves", async () => {
    const first = solve({ _id: "solve:first", date: 200 });
    const second = solve({ _id: "solve:second", date: 100 });
    const { feature, port, persistence } = setup({
      loadSolves: vi.fn(async () => [second, first]),
    });

    await expect(feature.load()).resolves.toEqual(Ok(undefined));
    expect(feature.solves.map(item => item._id)).toEqual(["solve:first", "solve:second"]);
    expect(feature.selectedCount).toBe(0);

    expect(feature.toggleSelected(feature.solves[0])).toBe(1);
    expect(feature.selectedSolves.map(item => item._id)).toEqual(["solve:first"]);

    expect(feature.selectAll(feature.solves)).toBe(2);
    expect(feature.invertSelection([feature.solves[0]])).toBe(1);
    expect(feature.selectedSolves.map(item => item._id)).toEqual(["solve:second"]);

    await expect(feature.removeSelected()).resolves.toMatchObject({
      ok: true,
      value: [expect.objectContaining({ _id: "solve:second" })],
    });
    expect(port.removeSolves).toHaveBeenCalledWith([
      expect.objectContaining({ _id: "solve:second" }),
    ]);
    expect(feature.solves.map(item => item._id)).toEqual(["solve:first"]);
    expect(feature.selectedCount).toBe(0);
    persistence.destroy();
  });

  it("rejects update and remove operations crossing session scope", async () => {
    const { bus, feature, persistence } = setup();
    const observed: TimerEvent[] = [];
    bus.observe(event => observed.push(event));
    const foreign = solve({ session: "session:two" });

    await expect(feature.update(foreign)).resolves.toEqual(
      Err(
        expect.objectContaining({
          code: "SESSION_SCOPE_MISMATCH",
          operation: "update",
        })
      )
    );
    await expect(feature.remove([solve(), foreign])).resolves.toEqual(
      Err(
        expect.objectContaining({
          code: "SESSION_SCOPE_MISMATCH",
          operation: "remove",
        })
      )
    );
    expect(observed).toEqual([]);
    persistence.destroy();
  });

  it("returns typed persistence failures", async () => {
    const { feature, persistence } = setup({
      updateSolve: vi.fn(async () => {
        throw new Error("disk unavailable");
      }),
    });

    await expect(feature.update(solve())).resolves.toEqual(
      Err({
        code: "SOLVE_PERSISTENCE_FAILED",
        operation: "update",
        message: "disk unavailable",
      })
    );
    expect(feature.error?.message).toBe("disk unavailable");
    persistence.destroy();
  });

  it("destroy detaches its projection", async () => {
    const { bus, events, feature, persistence } = setup();
    feature.destroy();

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "later",
        solve: solve(),
      })
    );

    expect(feature.items).toEqual([]);
    persistence.destroy();
  });
});
