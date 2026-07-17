import { beforeEach, describe, expect, it } from 'vitest';
import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { TimerReactor } from './TimerReactor';
import { TimerState } from './TimerState.svelte';

describe('TimerReactor', () => {
  let id: number;
  let factory: TimerEventFactory;
  let bus: EventBus<TimerEvent>;
  let state: TimerState;
  let reactor: TimerReactor;

  beforeEach(() => {
    id = 0;
    factory = new TimerEventFactory(
      { now: () => 100 },
      { next: () => `event-${++id}` },
    );
    bus = createApplicationEventBus(factory);
    state = new TimerState();
    reactor = new TimerReactor(bus, state, 'timer:one');
  });

  it('projects the standard device lifecycle', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.PREVENTION);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
    }));
    expect(state.ready).toBe(true);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      ready: true,
    }));
    expect(state.ready).toBe(true);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_INSPECTION_STARTED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.INSPECTION);
    expect(state.decimals).toBe(false);
    expect(state.ready).toBe(false);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.RUNNING);
    expect(state.ready).toBe(false);
    expect(state.activeDeviceId).toBe('keyboard');

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      elapsedMs: 1234,
      steps: [500, 734],
    }));
    expect(state.timerState).toBe(TimerStateValue.STOPPED);
    expect(state.time).toBe(1234);
    expect(state.steps).toEqual([500, 734]);
  });

  it('projects pause, resume, penalty, and cancellation', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PAUSED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.PAUSE);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RESUMED, { ownerId: 'timer:one', deviceId: 'keyboard' }));
    expect(state.timerState).toBe(TimerStateValue.RUNNING);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      penalty: Penalty.DNF,
      fromInspection: true,
    }));
    expect(state.penalty).toBe(Penalty.DNF);
    expect(state.dnfFromInspection).toBe(true);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      cancelledFrom: TimerStateValue.RUNNING,
    }));
    expect(state.timerState).toBe(TimerStateValue.CLEAN);
    expect(state.penalty).toBe(Penalty.NONE);
  });

  it('appends multi-step readings', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_STEP_COMPLETED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      stepNumber: 1,
      elapsedMs: 450,
    }));
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_STEP_COMPLETED, {
      ownerId: 'timer:one',
      deviceId: 'keyboard',
      stepNumber: 2,
      elapsedMs: 900,
    }));

    expect(state.steps).toEqual([450, 900]);
  });

  it('stops projecting after destroy', async () => {
    reactor.destroy();

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { ownerId: 'timer:one', deviceId: 'keyboard' }));

    expect(state.timerState).toBe(TimerStateValue.CLEAN);
  });

  it('ignores lifecycle events and active-device facts for other owners', async () => {
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
      ownerId: 'timer:two',
      deviceId: 'other-device',
    }));
    await bus.publish(factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGED, {
      ownerId: 'timer:two',
      deviceId: 'other-device',
      previousDeviceId: null,
    }));

    expect(state.timerState).toBe(TimerStateValue.CLEAN);
    expect(state.activeDeviceId).toBeNull();
  });
});
