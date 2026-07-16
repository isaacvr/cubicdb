import { afterEach, describe, expect, it, vi } from 'vitest';
import { AverageSetting, TimerState as TimerStateValue } from '@interfaces';
import { createTimerRuntime } from '../TimerCompositionRoot.svelte';
import { TIMER_DEVICE_IDS } from './TimerDeviceDescriptor';

describe('keyboard timer flow', () => {
  afterEach(() => vi.useRealTimers());

  it('projects native keyboard input through the real bus when enabled', async () => {
    vi.useFakeTimers();
    let id = 0;
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 0 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: null,
    });
    runtime.state.session = {
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
    };
    await runtime.ready;
    expect(await runtime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(true);

    await runtime.keyboard?.boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    expect(runtime.state.timerState).toBe(TimerStateValue.PREVENTION);
    await vi.advanceTimersByTimeAsync(300);
    await runtime.keyboard?.boundary.keyUp({ code: 'Space', timeStamp: 500 });
    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);

    await runtime.keyboard?.boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 1500 });
    await runtime.keyboard?.boundary.keyUp({ code: 'Space', timeStamp: 1600 });

    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1100);
    await runtime.destroy();
  });

  it('retains the legacy boundary when the keyboard flag is disabled', async () => {
    const runtime = createTimerRuntime({ eventLogSink: null });

    expect(runtime.keyboard).toBeNull();

    await runtime.destroy();
  });
});
