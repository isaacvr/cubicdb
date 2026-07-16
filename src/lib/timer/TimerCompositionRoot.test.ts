import { describe, expect, it, vi } from 'vitest';
import { TimerState as TimerStateValue } from '@interfaces';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerRuntime } from './TimerCompositionRoot.svelte';
import { DEFAULT_TIMER_MIGRATION_FLAGS } from './TimerMigrationFlags';
import { createTimerApplicationRuntime } from './TimerApplicationRuntime';
import { TIMER_DEVICE_IDS } from './devices/TimerDeviceDescriptor';

describe('TimerCompositionRoot', () => {
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
    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: 1234,
      steps: [],
    }));

    expect(onRunStopped).toHaveBeenCalledOnce();
    expect(onRunStopped).toHaveBeenCalledWith(1234);
    await runtime.destroy();
  });
});
