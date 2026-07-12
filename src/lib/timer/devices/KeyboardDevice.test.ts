import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AverageSetting, TimerState as TimerStateValue } from '@interfaces';
import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerReadonlyView } from '../TimerReadonlyView';
import { KeyboardInputBoundary } from '../handlers/KeyboardInputBoundary';
import { KeyboardDevice } from './KeyboardDevice';

describe('KeyboardDevice', () => {
  let now: number;
  let events: TimerEventFactory;
  let bus: TimerEventBus;
  let boundary: KeyboardInputBoundary;
  let device: KeyboardDevice;
  let emitted: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    let id = 0;
    events = new TimerEventFactory(
      { now: () => now },
      { next: () => `event-${++id}` },
    );
    bus = new TimerEventBus(events);
    boundary = new KeyboardInputBoundary(bus, events);
    emitted = [];
    bus.observe(event => {
      if (event.type.startsWith('timer.device.')) emitted.push(event.type);
    });
    const view: TimerReadonlyView = {
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
    device = new KeyboardDevice(bus, events, view, () => {}, { preventionMs: 300 });
    device.start();
  });

  afterEach(() => {
    device.destroy();
    vi.useRealTimers();
  });

  it('runs prevention, ready, start, and stop using native timestamps', async () => {
    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    expect(emitted).toContain(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED);

    await vi.advanceTimersByTimeAsync(300);
    expect(emitted).toContain(TIMER_EVENTS.DEVICE_READY);

    await boundary.keyUp({ code: 'Space', timeStamp: 450 });
    expect(emitted).toContain(TIMER_EVENTS.DEVICE_RUN_STARTED);

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 1700 });
    const stopped: number[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_RUN_STOPPED, 'test:stopped', event => {
      stopped.push(event.payload.elapsedMs);
    });
    await boundary.keyUp({ code: 'Space', timeStamp: 1800 });

    expect(stopped).toEqual([1350]);
  });

  it('cancels to clean on Escape', async () => {
    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    await boundary.keyDown({ code: 'Escape', repeat: false, timeStamp: 150 });

    expect(emitted).toContain(TIMER_EVENTS.DEVICE_RUN_CANCELLED);
  });
});
