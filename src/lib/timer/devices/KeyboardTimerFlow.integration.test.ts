import { afterEach, describe, expect, it, vi } from "vitest";
import { AverageSetting, Penalty, TimerState as TimerStateValue, type Solve } from "@interfaces";
import { createTimerRuntime } from "../TimerCompositionRoot.svelte";
import { createTimerApplicationRuntime } from "../TimerApplicationRuntime";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TIMER_DEVICE_IDS } from "./TimerDeviceDescriptor";

describe("keyboard timer flow", () => {
  afterEach(() => vi.useRealTimers());

  it("projects native keyboard input through the real bus when enabled", async () => {
    vi.useFakeTimers();
    let id = 0;
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 0 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: null,
    });
    runtime.state.session = {
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
    };
    await runtime.ready;
    expect(await runtime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(true);

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    expect(runtime.state.timerState).toBe(TimerStateValue.PREVENTION);
    await vi.advanceTimersByTimeAsync(300);
    await runtime.keyboard?.boundary.keyUp({ code: "Space", timeStamp: 500 });
    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 1500 });

    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1000);

    await runtime.keyboard?.boundary.keyUp({ code: "Space", timeStamp: 1600 });

    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1000);
    await runtime.destroy();
  });

  it("retains the legacy boundary when the keyboard flag is disabled", async () => {
    const runtime = createTimerRuntime({ eventLogSink: null });

    expect(runtime.keyboard).toBeNull();

    await runtime.destroy();
  });

  it("projects inspection +2 and automatic DNF through the real runtime", async () => {
    vi.useFakeTimers();
    let now = 0;
    const getSolveRequest = vi.fn((elapsedMs: number, penalty: Penalty) => ({
      time: elapsedMs,
      penalty,
      session: "session",
      scramble: "R U",
    }));
    const application = createTimerApplicationRuntime({
      clock: { now: () => now },
      eventLogSink: null,
      solvePersistence: {
        loadSolves: vi.fn(),
        addSolve: vi.fn(async solve => solve as Solve),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    const observed: TimerEvent[] = [];
    application.bus.observe(event => observed.push(event));
    const runtime = createTimerRuntime({
      application,
      flags: { keyboard: true },
      getSolveRequest,
    });
    runtime.state.session = {
      _id: "session",
      name: "Session",
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

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    now = 300;
    await vi.advanceTimersByTimeAsync(200);
    now = 400;
    await runtime.keyboard?.boundary.keyUp({ code: "Space", timeStamp: 400 });

    now = 15400;
    await vi.advanceTimersByTimeAsync(15000);
    expect(runtime.state.penalty).toBe(Penalty.P2);

    now = 17400;
    await vi.advanceTimersByTimeAsync(2000);
    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.penalty).toBe(Penalty.DNF);
    expect(runtime.state.time).toBe(Infinity);
    expect(getSolveRequest).toHaveBeenCalledWith(Infinity, Penalty.DNF, []);
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        payload: expect.objectContaining({
          ownerId: "timer:local-runtime",
          solve: expect.objectContaining({
            time: Infinity,
            penalty: Penalty.DNF,
          }),
        }),
      })
    );

    await runtime.destroy();
    await application.destroy();
  });

  it("pauses with P and resumes with Space while preserving active elapsed time only", async () => {
    vi.useFakeTimers();
    let id = 0;
    const observed: TimerEvent[] = [];
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 0 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: null,
    });
    runtime.application.bus.observe(event => observed.push(event));
    runtime.state.session = {
      _id: "session",
      name: "Session",
      settings: {
        hasInspection: false,
        inspection: 15,
        showElapsedTime: true,
        calcAoX: AverageSetting.SEQUENTIAL,
        genImage: true,
        scrambleAfterCancel: false,
        withoutPrevention: true,
      },
    };
    await runtime.ready;
    await runtime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 100 });
    await runtime.keyboard?.boundary.keyUp({ code: "Space", timeStamp: 100 });
    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);

    await runtime.keyboard?.boundary.keyDown({ code: "KeyP", repeat: false, timeStamp: 600 });
    expect(runtime.state.timerState).toBe(TimerStateValue.PAUSE);

    await runtime.keyboard?.boundary.keyDown({ code: "KeyP", repeat: false, timeStamp: 1600 });
    expect(runtime.state.timerState).toBe(TimerStateValue.PAUSE);

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 1600 });
    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);

    await runtime.keyboard?.boundary.keyDown({ code: "Space", repeat: false, timeStamp: 2100 });
    expect(runtime.state.timerState).toBe(TimerStateValue.STOPPED);
    expect(runtime.state.time).toBe(1000);
    expect(observed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: TIMER_EVENTS.DEVICE_PAUSED }),
        expect.objectContaining({ type: TIMER_EVENTS.DEVICE_RESUMED }),
      ])
    );

    await runtime.destroy();
  });
});
