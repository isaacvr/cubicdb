import { describe, expect, it } from "vitest";
import { Penalty, type Solve } from "@interfaces";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createSolveProjection } from "./SolveProjection.svelte";

function solve(id: string, session = "session:one", date = 1): Solve {
  return {
    _id: id,
    session,
    time: 1000,
    date,
    scramble: "R U",
    penalty: Penalty.NONE,
    selected: false,
  };
}

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 1 }, { next: () => `event-${++id}` });
  const projection = createSolveProjection({
    bus,
    ownerId: "timer:one",
    sessionId: "session:one",
  });
  return { bus, events, projection };
}

describe("SolveProjection", () => {
  it("projects only its owner and session", async () => {
    const { bus, events, projection } = setup();
    const first = solve("first");
    const second = solve("second", "session:two");

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
        ownerId: "timer:two",
        sessionId: "session:one",
        requestId: "other-owner",
        solves: [first],
      })
    );
    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
        ownerId: "timer:one",
        sessionId: "session:two",
        requestId: "other-session",
        solves: [second],
      })
    );
    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "matching",
        solves: [first, second],
      })
    );

    expect(projection.items).toEqual([first]);
  });

  it("tracks loading and list results", async () => {
    const { bus, events, projection } = setup();
    const first = solve("first");

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_REQUESTED, {
        ownerId: "timer:one",
        sessionId: "session:one",
      })
    );
    expect(projection.loading).toBe(true);

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "list-request",
        solves: [first],
      })
    );
    expect(projection.loading).toBe(false);
    expect(projection.items).toEqual([first]);
    expect(projection.consumeResult<void>("list-request")).toEqual({ ok: true, value: undefined });
    expect(projection.consumeResult<void>("list-request")).toBeUndefined();
  });

  it("orders loaded solves by date descending", async () => {
    const { bus, events, projection } = setup();
    const oldest = solve("oldest", "session:one", 100);
    const newest = solve("newest", "session:one", 300);
    const middle = solve("middle", "session:one", 200);

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "list-request",
        solves: [oldest, newest, middle],
      })
    );

    expect(projection.items.map(item => item._id)).toEqual(["newest", "middle", "oldest"]);
  });

  it("keeps added and updated solves ordered by date descending", async () => {
    const { bus, events, projection } = setup();
    const oldest = solve("oldest", "session:one", 100);
    const newest = solve("newest", "session:one", 300);
    const movedToMiddle = solve("oldest", "session:one", 200);

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "add-oldest",
        solve: oldest,
      })
    );
    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "add-newest",
        solve: newest,
      })
    );
    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_UPDATED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "update-oldest",
        previousSolve: oldest,
        solve: movedToMiddle,
      })
    );

    expect(projection.items.map(item => item._id)).toEqual(["newest", "oldest"]);
    expect(projection.items.map(item => item.date)).toEqual([300, 200]);
  });

  it("adds, replaces updates, and filters removals", async () => {
    const { bus, events, projection } = setup();
    const first = solve("first");
    const updated = { ...first, time: 900 };

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "add-request",
        solve: first,
      })
    );
    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_UPDATED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "update-request",
        previousSolve: first,
        solve: updated,
      })
    );
    expect(projection.items).toEqual([updated]);
    expect(projection.consumeResult<Solve>("update-request")).toEqual({ ok: true, value: updated });

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVES_REMOVED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "remove-request",
        solves: [updated],
      })
    );
    expect(projection.items).toEqual([]);
  });

  it("projects failures and stores their correlated result", async () => {
    const { bus, events, projection } = setup();
    const error = {
      code: "SOLVE_PERSISTENCE_FAILED" as const,
      operation: "update" as const,
      message: "disk unavailable",
    };

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_REQUEST_FAILED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "update-request",
        operation: "update",
        error,
      })
    );

    expect(projection.loading).toBe(false);
    expect(projection.error).toEqual(error);
    expect(projection.consumeResult("update-request")).toEqual({ ok: false, error });
  });

  it("detaches idempotently and ignores later events", async () => {
    const { bus, events, projection } = setup();
    projection.detach();
    projection.detach();

    await bus.publish(
      events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "add-request",
        solve: solve("first"),
      })
    );

    expect(projection.items).toEqual([]);
  });
});
