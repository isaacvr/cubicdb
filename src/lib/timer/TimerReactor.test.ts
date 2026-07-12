import { beforeEach, describe, expect, it } from 'vitest';
import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { TimerReactor } from './TimerReactor';
import { TimerState } from './TimerState.svelte';

describe('TimerReactor', () => {
  let id: number;
  let factory: TimerEventFactory;
  let bus: TimerEventBus;
  let state: TimerState;
  let reactor: TimerReactor;

  beforeEach(() => {
    id = 0;
    factory = new TimerEventFactory(
      { now: () => 100 },
      { next: () => `event-${++id}` },
    );
    bus = new TimerEventBus(factory);
    state = new TimerState();
    reactor = new TimerReactor(bus, state);
  });

  it('projects the standard device lifecycle', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.PREVENTION);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED, {
      deviceId: 'keyboard',
      ready: true,
    }));
    expect(state.ready).toBe(true);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_INSPECTION_STARTED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.INSPECTION);
    expect(state.decimals).toBe(false);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.RUNNING);
    expect(state.ready).toBe(false);
    expect(state.activeDeviceId).toBe('keyboard');

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      deviceId: 'keyboard',
      elapsedMs: 1234,
      steps: [500, 734],
    }));
    expect(state.timerState).toBe(TimerStateValue.STOPPED);
    expect(state.time).toBe(1234);
    expect(state.steps).toEqual([500, 734]);
  });

  it('projects pause, resume, penalty, and cancellation', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { deviceId: 'keyboard' }));
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PAUSED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.PAUSE);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RESUMED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.RUNNING);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, {
      deviceId: 'keyboard',
      penalty: Penalty.DNF,
      fromInspection: true,
    }));
    expect(state.penalty).toBe(Penalty.DNF);
    expect(state.dnfFromInspection).toBe(true);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, { deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.CLEAN);
    expect(state.penalty).toBe(Penalty.NONE);
  });

  it('appends multi-step readings', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_STEP_COMPLETED, {
      deviceId: 'keyboard',
      stepNumber: 1,
      elapsedMs: 450,
    }));
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_STEP_COMPLETED, {
      deviceId: 'keyboard',
      stepNumber: 2,
      elapsedMs: 900,
    }));

    expect(state.steps).toEqual([450, 900]);
  });

  it('stops projecting after destroy', async () => {
    reactor.destroy();

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { deviceId: 'keyboard' }));

    expect(state.timerState).toBe(TimerStateValue.CLEAN);
  });
});
