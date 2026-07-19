import { Penalty, type Solve } from "@interfaces";
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createSolveEventEmitters } from "./solveEventEmitters";

const solve: Solve = {
  _id: "solve-1",
  session: "session-1",
  group: 0,
  mode: "333",
  len: 20,
  prob: -1,
  time: 12345,
  penalty: Penalty.NONE,
  scramble: "R U R'",
  date: 1,
  selected: false,
  comments: "",
};

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 1000 }, { next: () => `solve-event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("solveEventEmitters", () => {
  it("publishes solve list requests with owner and query", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestList({
      ownerId: "timer:1",
      query: { sessionId: "session-1" },
    });

    expect(observed[0]).toMatchObject({
      type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
      payload: {
        ownerId: "timer:1",
        query: { sessionId: "session-1" },
      },
    });
  });

  it("publishes add, update, and remove requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestAdd({ ownerId: "timer:1", solve });
    await emitters.requestUpdate({ ownerId: "timer:1", solve });
    await emitters.requestRemove({ ownerId: "timer:1", solves: [solve] });

    expect(observed.map(event => event.type)).toEqual([
      TIMER_EVENTS.SOLVE_ADD_REQUESTED,
      TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
      TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
    ]);
    expect(observed[2].payload).toMatchObject({
      ownerId: "timer:1",
      solves: [solve],
    });
  });

  it("preserves native timestamps for solve updates", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestUpdate({
      ownerId: "timer:1",
      solve,
      sourceEvent: { timeStamp: 42 },
    });

    expect(observed[0].timestamp).toBe(42);
  });
});
