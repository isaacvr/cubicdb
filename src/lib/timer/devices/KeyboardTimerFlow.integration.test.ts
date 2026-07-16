import { afterEach, describe, expect, it, vi } from 'vitest';
import { AverageSetting, Penalty, TimerState as TimerStateValue } from '@interfaces';
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

    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1000);

    await runtime.keyboard?.boundary.keyUp({ code: 'Space', timeStamp: 1600 });

    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1000);
    await runtime.destroy();
  });

  it('retains the legacy boundary when the keyboard flag is disabled', async () => {
    const runtime = createTimerRuntime({ eventLogSink: null });

    expect(runtime.keyboard).toBeNull();

    await runtime.destroy();
  });

  it('projects inspection +2 and automatic DNF through the real runtime', async () => {
    vi.useFakeTimers();
    let now = 0;
    const onRunStopped = vi.fn();
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => now },
      eventLogSink: null,
      onRunStopped,
    });
    runtime.state.session = {
      _id: 'session',
      name: 'Session',
      settings: {
        hasInspection: true,
        inspection: 15,
        showElapsedTime: true,
        calcAoX: AverageSetting.SEQUENTIAL,
        genImage: true,
        scrambleAfterCancel: false,
        withoutPrevention: false,
      },
    };
    await runtime.ready;
    await runtime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);

    await runtime.keyboard?.boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 100 });
    now = 300;
    await vi.advanceTimersByTimeAsync(200);
    now = 400;
    await runtime.keyboard?.boundary.keyUp({ code: 'Space', timeStamp: 400 });

    now = 15400;
    await vi.advanceTimersByTimeAsync(15000);
    expect(runtime.state.penalty).toBe(Penalty.P2);

    now = 17400;
    await vi.advanceTimersByTimeAsync(2000);
    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.penalty).toBe(Penalty.DNF);
    expect(runtime.state.time).toBe(Infinity);
    expect(onRunStopped).toHaveBeenCalledWith(Infinity, Penalty.DNF);

    await runtime.destroy();
  });
});
