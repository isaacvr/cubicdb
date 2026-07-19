import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createTypedEventEmitter } from "./createTypedEventEmitter";

function setup() {
  let now = 100;
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => now }, { next: () => `event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return {
    bus,
    events,
    observed,
    setNow(value: number) {
      now = value;
    },
  };
}

describe("createTypedEventEmitter", () => {
  it("publishes a typed event using the injected clock timestamp", async () => {
    const { bus, events, observed, setNow } = setup();
    const emit = createTypedEventEmitter({ bus, events });

    setNow(456);
    const eventId = await emit(TIMER_EVENTS.SOLVES_LIST_REQUESTED, {
      ownerId: "timer:1",
      query: { sessionId: "session-1" },
    });

    expect(eventId).toBe("event-1");
    expect(observed).toEqual([
      {
        id: "event-1",
        type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        timestamp: 456,
        payload: {
          ownerId: "timer:1",
          query: { sessionId: "session-1" },
        },
      },
    ]);
  });

  it("preserves a native source timestamp", async () => {
    const { bus, events, observed } = setup();
    const emit = createTypedEventEmitter({ bus, events });

    await emit(
      TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
      {
        ownerId: "timer:1",
        deviceId: "cubicdb:device:timer_keyboard",
      },
      { sourceEvent: { timeStamp: 789 } }
    );

    expect(observed[0].timestamp).toBe(789);
  });
});
