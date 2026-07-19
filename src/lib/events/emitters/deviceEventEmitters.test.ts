import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createDeviceEventEmitters } from "./deviceEventEmitters";

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 123 }, { next: () => `device-event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("deviceEventEmitters", () => {
  it("publishes active device change and release requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createDeviceEventEmitters({ bus, events });

    await emitters.requestActiveDevice({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });
    await emitters.requestActiveDeviceRelease({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });

    expect(observed.map(event => event.type)).toEqual([
      TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
      TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
    ]);
    expect(observed[0].payload).toEqual({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });
  });

  it("publishes owner destroy requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createDeviceEventEmitters({ bus, events });

    await emitters.requestOwnerDestroy({
      ownerId: "timer:1",
      sourceEvent: { timeStamp: 987 },
    });

    expect(observed[0]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
      timestamp: 987,
      payload: { ownerId: "timer:1" },
    });
  });
});
