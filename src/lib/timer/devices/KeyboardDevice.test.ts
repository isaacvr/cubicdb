import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AverageSetting, TimerState as TimerStateValue } from '@interfaces';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { EventBus } from '$lib/events/EventBus';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerReadonlyView } from '../TimerReadonlyView';
import { KeyboardInputBoundary } from '../handlers/KeyboardInputBoundary';
import { KeyboardDevice } from './KeyboardDevice';
import { TIMER_DEVICE_IDS } from './TimerDeviceDescriptor';

describe('KeyboardDevice', () => {
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
    events = new TimerEventFactory(
      { now: () => now },
      { next: () => `event-${++id}` },
    );
    bus = createApplicationEventBus(events);
    boundary = new KeyboardInputBoundary(bus, events);
    emitted = [];
    bus.observe(event => {
      if (event.type.startsWith('timer.device.')) emitted.push(event);
    });
    view = {
      state: TimerStateValue.CLEAN,
      session: {
        _id: 'session',
        name: 'Session',
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
      scramble: '',
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

  it('is inert until started with an owner binding', async () => {
    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });

    expect(emitted).toEqual([]);
  });

  it('runs prevention, ready, start, and stop for its owner using exact timestamps', async () => {
    device.start({ ownerId: 'timer:one', readonlyView: view, onReading: () => {} });

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    expect(emitted[0]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_PREVENTION_ENTERED,
      timestamp: 100,
      payload: { ownerId: 'timer:one', deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    now = 400;
    await vi.advanceTimersByTimeAsync(300);
    expect(emitted[1]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_READY,
      timestamp: 400,
      payload: { ownerId: 'timer:one', deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    await boundary.keyUp({ code: 'Space', timeStamp: 450 });
    expect(emitted[2]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_STARTED,
      timestamp: 450,
      payload: { ownerId: 'timer:one', deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 1700 });
    const stopped: number[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_RUN_STOPPED, 'test:stopped', event => {
      stopped.push(event.payload.elapsedMs);
    });
    await boundary.keyUp({ code: 'Space', timeStamp: 1800 });

    expect(stopped).toEqual([1350]);
    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_STOPPED,
      timestamp: 1800,
      payload: { ownerId: 'timer:one', deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });
  });

  it('cancels to clean on Escape', async () => {
    device.start({ ownerId: 'timer:one', readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    await boundary.keyDown({ code: 'Escape', repeat: false, timeStamp: 150 });

    expect(emitted.at(-1)).toMatchObject({
      type: TIMER_EVENTS.DEVICE_RUN_CANCELLED,
      timestamp: 150,
      payload: { ownerId: 'timer:one', deviceId: TIMER_DEVICE_IDS.KEYBOARD },
    });
  });

  it('unsubscribes on stop and can restart with a different owner', async () => {
    device.start({ ownerId: 'timer:one', readonlyView: view, onReading: () => {} });
    device.stop();

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    expect(emitted).toEqual([]);

    device.start({ ownerId: 'timer:two', readonlyView: view, onReading: () => {} });
    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 200 });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.payload).toEqual({
      ownerId: 'timer:two',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
    });
  });

  it('sends high-frequency readings only to the active owner binding', async () => {
    const onReading = vi.fn();
    device.start({ ownerId: 'timer:one', readonlyView: view, onReading });

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    await vi.advanceTimersByTimeAsync(300);
    await boundary.keyUp({ code: 'Space', timeStamp: 450 });

    now = 460;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenLastCalledWith({ timestamp: 460, elapsedMs: 10 });

    device.stop();
    now = 470;
    await vi.advanceTimersByTimeAsync(10);
    expect(onReading).toHaveBeenCalledOnce();
  });
});
