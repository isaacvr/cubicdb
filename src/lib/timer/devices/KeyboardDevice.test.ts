import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AverageSetting, Penalty, TimerState as TimerStateValue } from "@interfaces";
import { createApplicationEventBus, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { EventBus } from "$lib/events/EventBus";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import type { TimerReadonlyView } from "../TimerReadonlyView";
import { KeyboardInputBoundary } from "../handlers/KeyboardInputBoundary";
import { KEYBOARD_DEVICE_TIMING, KeyboardDevice } from "./KeyboardDevice";
import {
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_TYPES,
} from "./TimerDeviceDescriptor";

describe("KeyboardDevice", () => {
  let now: number;
  let events: TimerEventFactory;
  let bus: EventBus<TimerEvent>;
  let boundary: KeyboardInputBoundary;
  let device: KeyboardDevice;
  let emitted: TimerEvent[];
  let view: TimerReadonlyView;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    let id = 0;
    events = new TimerEventFactory({ now: () => now }, { next: () => `event-${++id}` });
    bus = createApplicationEventBus(events);
    boundary = new KeyboardInputBoundary(bus, events);
    emitted = [];
    bus.observe(event => {
      if (event.type.startsWith("timer.device.")) emitted.push(event);
    });
    view = {
      state: TimerStateValue.CLEAN,
      session: {
        _id: "session",
        name: "Session",
        settings: {
          hasInspection: false,
          inspection: 15,
          showElapsedTime: true,
          calcAoX: AverageSetting.SEQUENTIAL,
          genImage: true,
          scrambleAfterCancel: false,
          withoutPrevention: false,
        },
      },
      scramble: "",
    };
    device = new KeyboardDevice(bus, events, {
      preventionMs: 300,
      clock: { now: () => now },
    });
  });

  afterEach(() => {
    device.destroy();
    vi.useRealTimers();
  });

  it("is inert until started with an owner binding", async () => {
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });

    expect(emitted).toEqual([]);
  });

  it("uses centralized descriptor and timing constants", () => {
    expect(device.descriptor).toMatchObject({
      id: TIMER_DEVICE_IDS.KEYBOARD,
      type: TIMER_DEVICE_TYPES.KEYBOARD,
      connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
      capabilities: [TIMER_DEVICE_CAPABILITIES.KEYBOARD],
    });
    expect(KEYBOARD_DEVICE_TIMING.DEFAULT_PREVENTION_MS).toBeGreaterThan(0);
    expect(KEYBOARD_DEVICE_TIMING.DEFAULT_RESTART_GAP_MS).toBeGreaterThan(0);
    expect(KEYBOARD_DEVICE_TIMING.INSPECTION_PENALTY_GRACE_MS).toBeGreaterThan(0);
  });

  it("runs prevention, ready, start, and stop for its owner using exact timestamps", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    expect(emitted[0]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_PREVENTION_ENTERED,
      timestamp: 100,
      payload: { ownerId: "timer:one", deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    expect(emitted[1]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_READY,
      timestamp: 400,
      payload: { ownerId: "timer:one", deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    await boundary.keyUp({ code: "Space", timeStamp: 450 });
    expect(emitted[2]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_STARTED,
      timestamp: 450,
      payload: { ownerId: "timer:one", deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    const stopped: number[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_RUN_STOPPED, "test:stopped", event => {
      stopped.push(event.payload.elapsedMs);
    });
    await boundary.keyDown({ code: "KeyA", repeat: false, timeStamp: 1700 });

    expect(stopped).toEqual([1250]);
    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_STOPPED,
      timestamp: 1700,
      payload: { ownerId: "timer:one", deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    await boundary.keyUp({ code: "Space", timeStamp: 1800 });

    expect(stopped).toEqual([1250]);
    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_STOPPED,
      timestamp: 1700,
      payload: { ownerId: "timer:one", deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });
  });

  it("cancels to clean on Escape", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    await boundary.keyDown({ code: "Escape", repeat: false, timeStamp: 150 });

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 150,
      payload: {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        cancelledFrom: TimerStateValue.PREVENTION,
      },
    });
  });

  it("reports running as the cancellation phase", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: "Space", timeStamp: 450 });

    await boundary.keyDown({ code: "Escape", repeat: false, timeStamp: 500 });

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 500,
      payload: {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        cancelledFrom: TimerStateValue.RUNNING,
      },
    });
  });

  it("cancels active input programmatically without requiring a native keyboard event", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: "Space", timeStamp: 450 });

    device.cancel(525);

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 525,
      payload: {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        cancelledFrom: TimerStateValue.RUNNING,
      },
    });
  });

  it("reports ready as a pre-run cancellation phase", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);

    await boundary.keyDown({ code: "Escape", repeat: false, timeStamp: 425 });

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 425,
      payload: { cancelledFrom: TimerStateValue.PREVENTION },
    });
  });

  it("reports inspection as the cancellation phase", async () => {
    view = {
      ...view,
      session: view.session
        ? {
            ...view.session,
            settings: { ...view.session.settings, hasInspection: true },
          }
        : null,
    };
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: "Space", timeStamp: 450 });

    await boundary.keyDown({ code: "Escape", repeat: false, timeStamp: 500 });

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 500,
      payload: {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        cancelledFrom: TimerStateValue.INSPECTION,
      },
    });
  });

  it("uses the session prevention setting and bypasses the hold delay", async () => {
    view = {
      ...view,
      session: view.session
        ? {
            ...view.session,
            settings: { ...view.session.settings, withoutPrevention: true },
          }
        : null,
    };
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });

    expect(emitted.map(event => event.type)).toEqual([
      TIMER_EVENTS.DEVICE_PREVENTION_ENTERED,
      TIMER_EVENTS.DEVICE_READY,
    ]);
  });

  it("unsubscribes on stop and can restart with a different owner", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    device.stop();

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    expect(emitted).toEqual([]);

    device.start({ ownerId: "timer:two", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 200 });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.payload).toEqual({
      ownerId: "timer:two",
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
    });
  });

  it("sends high-frequency readings only to the active owner binding", async () => {
    const onReading = vi.fn();
    device.start({ ownerId: "timer:one", readonlyView: view, onReading });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: "Space", timeStamp: 450 });

    now = 460;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenLastCalledWith({
      timestamp: 460,
      timeMs: 10,
      phase: "running",
    });

    device.stop();
    now = 470;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenCalledOnce();
  });

  it("reports an inspection countdown and replaces it with running readings", async () => {
    const onReading = vi.fn();
    view = {
      ...view,
      session: view.session
        ? {
            ...view.session,
            settings: { ...view.session.settings, hasInspection: true, inspection: 15 },
          }
        : null,
    };
    device.start({ ownerId: "timer:one", readonlyView: view, onReading });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    now = 500;
    await boundary.keyUp({ code: "Space", timeStamp: 500 });

    expect(onReading).toHaveBeenLastCalledWith({
      timestamp: 500,
      timeMs: 15000,
      phase: "inspection",
    });

    now = 1500;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenLastCalledWith({
      timestamp: 1500,
      timeMs: 14000,
      phase: "inspection",
    });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 1600 });
    await boundary.keyUp({ code: "Space", timeStamp: 1700 });
    now = 1710;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenLastCalledWith({
      timestamp: 1710,
      timeMs: 10,
      phase: "running",
    });
  });

  it("applies +2 at the inspection limit and DNF two seconds later", async () => {
    const onReading = vi.fn();
    view = {
      ...view,
      session: view.session
        ? {
            ...view.session,
            settings: { ...view.session.settings, hasInspection: true, inspection: 15 },
          }
        : null,
    };
    device.stop();
    device = new KeyboardDevice(bus, events, {
      preventionMs: 300,
      readingIntervalMs: 1000,
      clock: { now: () => now },
    });
    device.start({ ownerId: "timer:one", readonlyView: view, onReading });

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    now = 500;
    await boundary.keyUp({ code: "Space", timeStamp: 500 });

    now = 15500;
    await vi.advanceTimersByTimeAsync(15000);
    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_PENALTY_APPLIED,
      payload: { penalty: Penalty.P2, fromInspection: true },
    });

    now = 17500;
    await vi.advanceTimersByTimeAsync(2000);
    expect(emitted.slice(-2)).toMatchObject([
      {
        type: TIMER_EVENTS.DEVICE_PENALTY_APPLIED,
        payload: { penalty: Penalty.DNF, fromInspection: true },
      },
      {
        type: TIMER_EVENTS.DEVICE_RUN_STOPPED,
        payload: { elapsedMs: Infinity },
      },
    ]);
  });

  it("ignores attempts to restart during the one-second post-stop gap", async () => {
    device.start({ ownerId: "timer:one", readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: "Space", timeStamp: 450 });
    await boundary.keyDown({ code: "KeyA", repeat: false, timeStamp: 1000 });
    const eventCountAfterStop = emitted.length;

    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 1050 });
    expect(emitted).toHaveLength(eventCountAfterStop);

    now = 2000;
    await vi.advanceTimersByTimeAsync(1000);
    await boundary.keyDown({ code: "Space", repeat: false, timeStamp: 2050 });
    expect(emitted.at(-1)?.type).toBe(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED);
  });
});
