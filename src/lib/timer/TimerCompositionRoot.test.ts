import { describe, expect, it, vi } from 'vitest';
import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerRuntime } from './TimerCompositionRoot.svelte';
import { DEFAULT_TIMER_MIGRATION_FLAGS } from './TimerMigrationFlags';
import { createTimerApplicationRuntime } from './TimerApplicationRuntime';
import { TIMER_DEVICE_IDS } from './devices/TimerDeviceDescriptor';
import { SCRAMBLE_REQUEST_SOURCES } from '$lib/events/timer/ScrambleEventTypes';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { IScrambleGenerator } from './scramble/IScrambleGenerator';

describe('TimerCompositionRoot', () => {
  it('generates a 333 scramble through the default application service', async () => {
    const application = createTimerApplicationRuntime({ eventLogSink: null, devices: [] });
    const runtime = createTimerRuntime({ application, ownerId: 'timer:one' });

    await runtime.requestScramble({
      mode: '333',
      length: 20,
      probability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });

    await vi.waitFor(() => expect(runtime.state.scramble.length).toBeGreaterThan(0));
    await runtime.destroy();
    await application.destroy();
  });

  it('requests and projects a correlated scramble for only its owner', async () => {
    const generator: IScrambleGenerator = {
      id: 'test',
      supports: () => true,
      generate: () => 'R U',
    };
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      scrambleGenerators: [generator],
    });
    const first = createTimerRuntime({ application, ownerId: 'timer:one' });
    const second = createTimerRuntime({ application, ownerId: 'timer:two' });
    const observed: TimerEvent[] = [];
    application.bus.observe(event => observed.push(event));

    const requestId = await first.requestScramble({
      mode: '333',
      length: 20,
      probability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    }, { timeStamp: 75.5 });

    expect(observed.find(event => event.id === requestId)).toMatchObject({
      type: TIMER_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 75.5,
      payload: { ownerId: 'timer:one' },
    });
    expect(first.state.scrambleRequestId).toBe(requestId);
    await vi.waitFor(() => expect(first.state.scramble).toBe('R U'));
    expect(second.state.scramble).toBe('');

    await first.destroy();
    await second.destroy();
    await application.destroy();
  });

  it('wires one bus, state, reactor, and readonly view with legacy flags by default', async () => {
    let id = 0;
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: null,
    });

    expect(runtime.flags).toEqual(DEFAULT_TIMER_MIGRATION_FLAGS);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.CLEAN);

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
      ownerId: 'timer:local-runtime',
      deviceId: 'keyboard',
    }));

    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.RUNNING);
    await runtime.destroy();
  });

  it('accepts a partial migration-flag override without mutating defaults', async () => {
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 10 },
      idProvider: { next: () => 'event-1' },
      eventLogSink: null,
    });

    expect(runtime.flags.keyboard).toBe(true);
    expect(runtime.flags.manual).toBe(false);
    expect(DEFAULT_TIMER_MIGRATION_FLAGS.keyboard).toBe(false);
    await runtime.destroy();
  });

  it('destroys subscriptions idempotently', async () => {
    const info = vi.fn();
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => 'event-1' },
      eventLogSink: { info },
    });
    await runtime.ready;
    info.mockClear();

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_READY, {
      ownerId: 'timer:local-runtime',
      deviceId: 'keyboard',
    }));
    expect(info).toHaveBeenCalledOnce();

    await runtime.destroy();
    await runtime.destroy();
    info.mockClear();

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
      ownerId: 'timer:local-runtime',
      deviceId: 'keyboard',
    }));

    expect(runtime.state.timerState).toBe(TimerStateValue.CLEAN);
    expect(info).not.toHaveBeenCalled();
  });

  it('leases the application-owned keyboard to only one timer owner', async () => {
    const application = createTimerApplicationRuntime({ eventLogSink: null });
    const first = createTimerRuntime({
      application,
      ownerId: 'timer:one',
      flags: { keyboard: true },
    });
    const second = createTimerRuntime({
      application,
      ownerId: 'timer:two',
      flags: { keyboard: true },
    });

    await application.ready;

    expect(await first.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(true);
    expect(await second.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(false);
    expect(application.catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.leaseOwnerId).toBe('timer:one');
    expect(second.state.activeDeviceId).toBeNull();

    await first.destroy();
    await second.destroy();
    await application.destroy();
  });

  it('routes run completion to the matching owner exactly once', async () => {
    const onRunStopped = vi.fn();
    const runtime = createTimerRuntime({
      ownerId: 'timer:one',
      eventLogSink: null,
      onRunStopped,
    });

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:two',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: 500,
      steps: [],
    }));
    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      penalty: Penalty.P2,
      fromInspection: true,
    }));
    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: 1234,
      steps: [],
    }));

    expect(onRunStopped).toHaveBeenCalledOnce();
    expect(onRunStopped).toHaveBeenCalledWith(1234, Penalty.P2);
    await runtime.destroy();
  });
});
