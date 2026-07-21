import { describe, expect, it, vi } from "vitest";
import { AverageSetting, Penalty, TimerState as TimerStateValue, type Solve } from "@interfaces";
import { CubeMode } from "@constants";
import { GENERATION_EVENTS } from "$lib/events/generation";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createTimerRuntime } from "./TimerCompositionRoot.svelte";
import { DEFAULT_TIMER_MIGRATION_FLAGS } from "./TimerMigrationFlags";
import { createTimerApplicationRuntime } from "./TimerApplicationRuntime";
import { TIMER_DEVICE_IDS } from "./devices/TimerDeviceDescriptor";
import { SCRAMBLE_REQUEST_SOURCES } from "$lib/events/timer/ScrambleEventTypes";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import type { IScrambleGenerator } from "./scramble/IScrambleGenerator";
import type { IImageGenerator } from "./scramble/IImageGenerator";

function session(genImage: boolean) {
  return {
    _id: "session",
    name: "Session",
    settings: {
      hasInspection: true,
      inspection: 15,
      showElapsedTime: true,
      calcAoX: AverageSetting.SEQUENTIAL,
      genImage,
      scrambleAfterCancel: false,
      withoutPrevention: false,
    },
  };
}

describe("TimerCompositionRoot", () => {
  it("generates a 333 scramble through the default application service", async () => {
    const application = createTimerApplicationRuntime({ eventLogSink: null, devices: [] });
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });

    await runtime.requestScramble({
      mode: "333",
      length: 20,
      probability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });

    await vi.waitFor(() => expect(runtime.state.scramble.length).toBeGreaterThan(0));
    await runtime.destroy();
    await application.destroy();
  });

  it("requests and projects a correlated scramble for only its owner", async () => {
    const generator: IScrambleGenerator = {
      id: "test",
      supports: () => true,
      generate: () => "R U",
    };
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      scrambleGenerators: [generator],
    });
    const first = createTimerRuntime({ application, ownerId: "timer:one" });
    const second = createTimerRuntime({ application, ownerId: "timer:two" });
    const observed: TimerEvent[] = [];
    application.bus.observe(event => observed.push(event));

    const requestId = await first.requestScramble(
      {
        mode: "333",
        length: 20,
        probability: -1,
        source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
      },
      { timeStamp: 75.5 }
    );

    expect(observed.find(event => event.id === requestId)).toMatchObject({
      type: GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 75.5,
      payload: {
        scopeId: "timer:one",
        config: {
          mode: "333",
          length: 20,
          probability: -1,
          source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
        },
      },
    });
    expect(first.state.scrambleRequestId).toBe(requestId);
    await vi.waitFor(() => expect(first.state.scramble).toBe("R U"));
    expect(second.state.scramble).toBe("");

    await first.destroy();
    await second.destroy();
    await application.destroy();
  });

  it("requests and projects preview images after accepting the latest scramble when enabled", async () => {
    const scrambleGenerator: IScrambleGenerator = {
      id: "scramble",
      supports: () => true,
      generate: () => "R U",
    };
    const imageGenerator: IImageGenerator = {
      supports: () => true,
      generate: vi.fn(async () => ["svg"]),
    };
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      scrambleGenerators: [scrambleGenerator],
      imageGenerator,
    });
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });
    const observed: TimerEvent[] = [];
    runtime.state.session = session(true);
    application.bus.observe(event => observed.push(event));

    await runtime.requestScramble({
      mode: "333",
      length: 20,
      probability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });

    await vi.waitFor(() => expect(runtime.state.scramblePreview).toEqual(["svg"]));
    const imageRequest = observed.find(event => event.type === GENERATION_EVENTS.IMAGE_REQUESTED);
    expect(imageRequest).toMatchObject({
      payload: {
        scopeId: "timer:one",
        config: {
          scramble: "R U",
          scrambleMode: "333",
          puzzle: "rubik",
          mode: CubeMode.NORMAL,
          view: "2d",
          order: [3],
        },
      },
    });
    expect(runtime.state.scramblePreviewRequestId).toBe(imageRequest?.id);
    expect(imageGenerator.generate).toHaveBeenCalledWith({
      scramble: "R U",
      scrambleMode: "333",
      puzzle: "rubik",
      mode: CubeMode.NORMAL,
      view: "2d",
      order: [3],
    });

    await runtime.destroy();
    await application.destroy();
  });

  it("does not request preview images when the session disables image generation", async () => {
    const imageGenerator: IImageGenerator = {
      supports: () => true,
      generate: vi.fn(async () => ["svg"]),
    };
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      scrambleGenerators: [
        {
          id: "scramble",
          supports: () => true,
          generate: () => "R U",
        },
      ],
      imageGenerator,
    });
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });
    runtime.state.session = session(false);

    await runtime.requestScramble({
      mode: "333",
      length: 20,
      probability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });

    await vi.waitFor(() => expect(runtime.state.scramble).toBe("R U"));
    expect(imageGenerator.generate).not.toHaveBeenCalled();
    expect(runtime.state.scramblePreview).toEqual([]);

    await runtime.destroy();
    await application.destroy();
  });

  it("wires one bus, state, reactor, and readonly view with legacy flags by default", async () => {
    let id = 0;
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: null,
    });

    expect(runtime.flags).toEqual(DEFAULT_TIMER_MIGRATION_FLAGS);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.CLEAN);

    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
        ownerId: "timer:local-runtime",
        deviceId: "keyboard",
      })
    );

    expect(runtime.state.timerState).toBe(TimerStateValue.RUNNING);
    expect(runtime.readonlyView.state).toBe(TimerStateValue.RUNNING);
    await runtime.destroy();
  });

  it("accepts a partial migration-flag override without mutating defaults", async () => {
    const runtime = createTimerRuntime({
      flags: { keyboard: true },
      clock: { now: () => 10 },
      idProvider: { next: () => "event-1" },
      eventLogSink: null,
    });

    expect(runtime.flags.keyboard).toBe(true);
    expect(runtime.flags.manual).toBe(false);
    expect(DEFAULT_TIMER_MIGRATION_FLAGS.keyboard).toBe(false);
    await runtime.destroy();
  });

  it("destroys subscriptions idempotently", async () => {
    const info = vi.fn();
    const runtime = createTimerRuntime({
      clock: { now: () => 10 },
      idProvider: { next: () => "event-1" },
      eventLogSink: { info },
    });
    await runtime.ready;
    info.mockClear();

    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_READY, {
        ownerId: "timer:local-runtime",
        deviceId: "keyboard",
      })
    );
    expect(info.mock.calls.filter(call => call[0] === "event")).toHaveLength(1);

    await runtime.destroy();
    await runtime.destroy();
    info.mockClear();

    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STARTED, {
        ownerId: "timer:local-runtime",
        deviceId: "keyboard",
      })
    );

    expect(runtime.state.timerState).toBe(TimerStateValue.CLEAN);
    expect(info).not.toHaveBeenCalled();
  });

  it("leases the application-owned keyboard to only one timer owner", async () => {
    const application = createTimerApplicationRuntime({ eventLogSink: null });
    const first = createTimerRuntime({
      application,
      ownerId: "timer:one",
      flags: { keyboard: true },
    });
    const second = createTimerRuntime({
      application,
      ownerId: "timer:two",
      flags: { keyboard: true },
    });

    await application.ready;

    expect(await first.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(true);
    expect(await second.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)).toBe(false);
    expect(application.catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.leaseOwnerId).toBe("timer:one");
    expect(second.state.activeDeviceId).toBeNull();

    await first.destroy();
    await second.destroy();
    await application.destroy();
  });

  it("routes run completion to a scoped solve add request exactly once", async () => {
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      solvePersistence: {
        loadSolves: vi.fn(),
        addSolve: vi.fn(async solve => solve as Solve),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    const observed: TimerEvent[] = [];
    application.bus.observe(event => observed.push(event));
    const getSolveRequest = vi.fn((elapsedMs: number, penalty: Penalty, steps: number[]) => ({
      time: elapsedMs,
      penalty,
      steps,
      date: 1000,
      scramble: "R U",
      selected: false,
      session: "session",
    }));
    const runtime = createTimerRuntime({
      application,
      ownerId: "timer:one",
      getSolveRequest,
    });

    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
        ownerId: "timer:two",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        elapsedMs: 500,
        steps: [],
      })
    );
    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        penalty: Penalty.P2,
        fromInspection: true,
      })
    );
    await runtime.bus.publish(
      runtime.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
        ownerId: "timer:one",
        deviceId: TIMER_DEVICE_IDS.KEYBOARD,
        elapsedMs: 1234,
        steps: [1, 2],
      })
    );

    expect(getSolveRequest).toHaveBeenCalledOnce();
    expect(getSolveRequest).toHaveBeenCalledWith(1234, Penalty.P2, [1, 2]);
    expect(observed.filter(event => event.type === TIMER_EVENTS.SOLVE_ADD_REQUESTED)).toHaveLength(
      1
    );
    expect(observed.at(-2)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_ADD_REQUESTED,
      payload: {
        ownerId: "timer:one",
        sessionId: "session",
        solve: {
          time: 1234,
          penalty: Penalty.P2,
          steps: [1, 2],
        },
      },
    });
    await runtime.destroy();
    await application.destroy();
  });

  it("requests and resolves scoped solve lists through the bus", async () => {
    const solves: Solve[] = [
      {
        _id: "solve:one",
        time: 1000,
        date: 1000,
        scramble: "R U",
        penalty: Penalty.NONE,
        selected: false,
        session: "session",
      },
    ];
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      solvePersistence: {
        loadSolves: vi.fn(async () => solves),
        addSolve: vi.fn(),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    const observed: TimerEvent[] = [];
    application.bus.observe(event => observed.push(event));
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });
    const query = { sessionId: "session" };

    await application.ready;
    await expect(runtime.requestSolvesList(query)).resolves.toEqual(solves);

    expect(observed).toContainEqual(
      expect.objectContaining({
        type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        payload: { ownerId: "timer:one", sessionId: "session" },
      })
    );
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: TIMER_EVENTS.SOLVES_LIST_LOADED,
        payload: {
          ownerId: "timer:one",
          sessionId: "session",
          requestId: expect.any(String),
          solves,
        },
      })
    );
    await runtime.destroy();
    await application.destroy();
  });

  it("waits for application readiness before dispatching solve feature commands", async () => {
    let releaseReady!: () => void;
    const ready = new Promise<void>(resolve => {
      releaseReady = resolve;
    });
    const loadSolves = vi.fn(async () => []);
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      solvePersistence: {
        loadSolves,
        addSolve: vi.fn(),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    Object.defineProperty(application, "ready", { value: ready });
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });

    const load = runtime.getSolveFeature("session").load();
    await Promise.resolve();
    expect(loadSolves).not.toHaveBeenCalled();

    releaseReady();
    await expect(load).resolves.toMatchObject({ ok: true });
    expect(loadSolves).toHaveBeenCalledWith({ sessionId: "session" });

    await runtime.destroy();
    await application.destroy();
  });

  it("caches isolated solve features per session and detaches them on destroy", async () => {
    const solves: Solve[] = [
      {
        _id: "solve:one",
        time: 1000,
        date: 1000,
        scramble: "R U",
        penalty: Penalty.NONE,
        selected: false,
        session: "session:one",
      },
      {
        _id: "solve:two",
        time: 2000,
        date: 2000,
        scramble: "R U2",
        penalty: Penalty.NONE,
        selected: false,
        session: "session:two",
      },
    ];
    const application = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      solvePersistence: {
        loadSolves: vi.fn(async query =>
          solves.filter(solve => solve.session === query?.sessionId)
        ),
        addSolve: vi.fn(),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    const runtime = createTimerRuntime({ application, ownerId: "timer:one" });
    const first = runtime.getSolveFeature("session:one");
    const same = runtime.getSolveFeature("session:one");
    const second = runtime.getSolveFeature("session:two");

    expect(same).toBe(first);
    expect(second).not.toBe(first);
    await application.ready;
    await first.load();
    await second.load();
    expect(first.items.map(solve => solve._id)).toEqual(["solve:one"]);
    expect(second.items.map(solve => solve._id)).toEqual(["solve:two"]);

    await runtime.destroy();
    await application.bus.publish(
      application.events.create(TIMER_EVENTS.SOLVE_ADDED, {
        ownerId: "timer:one",
        sessionId: "session:one",
        requestId: "later",
        solve: solves[1],
      })
    );
    expect(first.items.map(solve => solve._id)).toEqual(["solve:one"]);
    await application.destroy();
  });
});
