import { describe, expect, it } from 'vitest';
import { TimerState as TimerStateValue } from '@interfaces';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerRuntime } from './TimerCompositionRoot.svelte';
import { DEFAULT_TIMER_MIGRATION_FLAGS } from './TimerMigrationFlags';

describe('TimerCompositionRoot', () => {
  it('wires one bus, state, reactor, and readonly view with legacy flags by default', async () => {
    let id = 0;
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => `event-${++id}` },
    });

    expect(runtime.flags).toEqual(DEFAULT_TIMER_MIGRATION_FLAGS);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.CLEAN);

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
      deviceId: 'keyboard',
    }));

    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.RUNNING);
  });

  it('accepts a partial migration-flag override without mutating defaults', () => {
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 10 },
      idProvider: { next: () => 'event-1' },
    });

    expect(runtime.flags.keyboard).toBe(true);
    expect(runtime.flags.manual).toBe(false);
    expect(DEFAULT_TIMER_MIGRATION_FLAGS.keyboard).toBe(false);
  });

  it('destroys subscriptions idempotently', async () => {
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => 'event-1' },
    });
    runtime.destroy();
    runtime.destroy();

    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
      deviceId: 'keyboard',
    }));

    expect(runtime.state.timerState).toBe(TimerStateValue.CLEAN);
  });
});
