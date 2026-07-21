import { describe, expect, it, vi } from "vitest";
import { createApplicationEventBus, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { Penalty, type Solve } from "@interfaces";
import { SolvePersistenceService, type SolvePersistencePort } from "./SolvePersistenceService";

function createSolve(overrides: Partial<Solve> = {}): Solve {
  return {
    _id: "solve:one",
    time: 1234,
    date: 1000,
    scramble: "R U R'",
    penalty: Penalty.NONE,
    selected: false,
    session: "session:one",
    ...overrides,
  };
}

function createHarness(port: SolvePersistencePort) {
  let id = 0;
  const events = new TimerEventFactory({ now: () => 42 }, { next: () => `event-${++id}` });
  const bus = createApplicationEventBus(events);
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new SolvePersistenceService(bus, events, port);
  return { bus, events, observed, service };
}

describe("SolvePersistenceService", () => {
  it("persists scoped solve add requests and publishes scoped added events", async () => {
    const saved = createSolve({ _id: "saved" });
    const port: SolvePersistencePort = {
      loadSolves: vi.fn(),
      addSolve: vi.fn(async () => saved),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);
    const requestSolve = createSolve({ _id: "draft" });

    const request = events.create(TIMER_EVENTS.SOLVE_ADD_REQUESTED, {
      ownerId: "timer:one",
      sessionId: "session:one",
      solve: requestSolve,
    });
    await bus.publish(request);

    expect(port.addSolve).toHaveBeenCalledWith(requestSolve);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_ADDED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: request.id,
        solve: saved,
      },
    });
    service.destroy();
  });

  it("persists scoped solve updates and publishes previous/current solve events", async () => {
    const previousSolve = createSolve({ comments: "before" });
    const updatedSolve = createSolve({ comments: "after" });
    const port: SolvePersistencePort = {
      loadSolves: vi.fn(),
      addSolve: vi.fn(),
      updateSolve: vi.fn(async () => ({ previousSolve, solve: updatedSolve })),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);

    const request = events.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
      ownerId: "timer:one",
      sessionId: "session:one",
      solve: updatedSolve,
    });
    await bus.publish(request);

    expect(port.updateSolve).toHaveBeenCalledWith(updatedSolve);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_UPDATED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: request.id,
        previousSolve,
        solve: updatedSolve,
      },
    });
    service.destroy();
  });

  it("persists scoped solve removals and publishes scoped removed events", async () => {
    const removedSolve = createSolve({ _id: "removed" });
    const port: SolvePersistencePort = {
      loadSolves: vi.fn(),
      addSolve: vi.fn(),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(async () => [removedSolve]),
    };
    const { bus, events, observed, service } = createHarness(port);

    const request = events.create(TIMER_EVENTS.SOLVES_REMOVE_REQUESTED, {
      ownerId: "timer:one",
      sessionId: "session:one",
      solves: [removedSolve],
    });
    await bus.publish(request);

    expect(port.removeSolves).toHaveBeenCalledWith([removedSolve]);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVES_REMOVED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: request.id,
        solves: [removedSolve],
      },
    });
    service.destroy();
  });

  it("loads solves from scoped list requests and publishes scoped list-loaded events", async () => {
    const loadedSolves = [
      createSolve({ _id: "first", session: "session:one" }),
      createSolve({ _id: "second", session: "session:two" }),
    ];
    const port: SolvePersistencePort = {
      loadSolves: vi.fn(async () => loadedSolves),
      addSolve: vi.fn(),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);
    const request = events.create(TIMER_EVENTS.SOLVES_LIST_REQUESTED, {
      ownerId: "timer:one",
      sessionId: "session:one",
    });
    await bus.publish(request);

    expect(port.loadSolves).toHaveBeenCalledWith({ sessionId: "session:one" });
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVES_LIST_LOADED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: request.id,
        solves: loadedSolves,
      },
    });
    service.destroy();
  });

  it("normalizes persistence failures into correlated solve failure events", async () => {
    const port: SolvePersistencePort = {
      loadSolves: vi.fn(),
      addSolve: vi.fn(),
      updateSolve: vi.fn(async () => {
        throw new Error("disk unavailable");
      }),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);
    const request = events.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
      ownerId: "timer:one",
      sessionId: "session:one",
      solve: createSolve(),
    });

    await bus.publish(request);

    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_REQUEST_FAILED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: request.id,
        operation: "update",
        error: {
          code: "SOLVE_PERSISTENCE_FAILED",
          operation: "update",
          message: "disk unavailable",
        },
      },
    });
    service.destroy();
  });
});
