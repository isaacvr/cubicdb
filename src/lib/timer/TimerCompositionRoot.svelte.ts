import type { EventBus, EventSubscription } from "$lib/events/EventBus";
import {
  GENERATION_EVENTS,
  type GenerationClient,
  type ScrambleGenerationConfig,
} from "$lib/events/generation";
import { TimerState as TimerStateValue, type Penalty, type Solve } from "@interfaces";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { EventLogSink } from "$lib/logger/EventLogger";
import type {
  IEventIdProvider,
  IMonotonicClock,
  NativeTimestampSource,
  TimerEventFactory,
} from "$lib/events/timer/TimerEventFactory";
import {
  SCRAMBLE_REQUEST_SOURCES,
  type ScrambleRequestInput,
  type ScrambleRequestSource,
} from "$lib/events/timer/ScrambleEventTypes";
import {
  createSolveFeature,
  type InternalSolveFeature,
  type SolveFeature,
} from "./solves/SolveFeature";
import { createImageGenerationConfig } from "./scramble/createImageGenerationConfig";
import { createTimerMigrationFlags, type TimerMigrationFlags } from "./TimerMigrationFlags";
import { TimerReactor } from "./TimerReactor";
import { createTimerReadonlyView, type TimerReadonlyView } from "./TimerReadonlyView";
import { TimerState } from "./TimerState.svelte";
import {
  createTimerApplicationRuntime,
  type TimerApplicationRuntime,
} from "./TimerApplicationRuntime";
import type { TimerReadingCallback } from "./devices/ITimerDevice";
import type { KeyboardDevice } from "./devices/KeyboardDevice";
import type { KeyboardInputBoundary } from "./handlers/KeyboardInputBoundary";
import { registerScrambleHandlers } from "./handlers/registerScrambleHandlers";

export interface TimerRuntimeOptions {
  application?: TimerApplicationRuntime;
  ownerId?: string;
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: EventLogSink | null;
  flags?: Partial<TimerMigrationFlags>;
  onTimerReading?: TimerReadingCallback;
  getSolveRequest?: (elapsedMs: number, penalty: Penalty, steps: number[]) => Partial<Solve> | null;
  getScrambleRequest?: (source: ScrambleRequestSource) => ScrambleRequestInput | null;
}

export interface TimerRuntime {
  readonly ownerId: string;
  readonly application: TimerApplicationRuntime;
  readonly state: TimerState;
  readonly readonlyView: TimerReadonlyView;
  readonly bus: EventBus<TimerEvent>;
  readonly events: TimerEventFactory;
  readonly generation: GenerationClient;
  readonly flags: TimerMigrationFlags;
  readonly keyboard: {
    device: KeyboardDevice;
    boundary: KeyboardInputBoundary;
  } | null;
  readonly ready: Promise<void>;
  requestActiveDevice(deviceId: string): Promise<boolean>;
  releaseActiveDevice(deviceId: string): Promise<void>;
  requestScramble(
    input: ScrambleRequestInput,
    nativeEvent?: NativeTimestampSource
  ): Promise<string>;
  getSolveFeature(sessionId: string): SolveFeature;
  requestSolveAdd(solve: Partial<Solve>, nativeEvent?: NativeTimestampSource): Promise<void>;
  requestSolveUpdate(solve: Solve, nativeEvent?: NativeTimestampSource): Promise<void>;
  requestSolvesRemove(solves: Solve[], nativeEvent?: NativeTimestampSource): Promise<void>;
  requestSolvesList(
    query: { sessionId: string },
    nativeEvent?: NativeTimestampSource
  ): Promise<Solve[]>;
  cancelActiveInput(timestamp?: number): void;
  destroy(): Promise<void>;
}

export function createTimerRuntime(options: TimerRuntimeOptions = {}): TimerRuntime {
  const ownsApplication = options.application === undefined;
  const application =
    options.application ??
    createTimerApplicationRuntime({
      clock: options.clock,
      idProvider: options.idProvider,
      eventLogSink: options.eventLogSink,
    });
  const ownerId = options.ownerId ?? "timer:local-runtime";
  const state = new TimerState();
  const readonlyView = createTimerReadonlyView(state);
  const flags = createTimerMigrationFlags(options.flags);
  const reactor = new TimerReactor(application.bus, state, ownerId);
  const generation = application.createGenerationClient(ownerId);
  const scrambleModesByRequestId = new Map<string, string>();
  const scrambleSubscription = registerScrambleHandlers(application.bus, state, ownerId);
  const previewSubscriptions: EventSubscription[] = [
    application.bus.subscribe(
      GENERATION_EVENTS.SCRAMBLE_GENERATED,
      `${ownerId}:timer-runtime:image-after-scramble`,
      async event => {
        if (event.payload.scopeId !== ownerId) return;
        if (event.payload.requestId !== state.scrambleRequestId) return;
        const scrambleMode = scrambleModesByRequestId.get(event.payload.requestId) ?? "333";
        scrambleModesByRequestId.delete(event.payload.requestId);
        const scramble = event.payload.scrambles[0] ?? "";
        if (!scramble || state.session?.settings.genImage !== true) {
          state.scramblePreview = [];
          state.scramblePreviewRequestId = null;
          state.scramblePreviewEnabled = false;
          return;
        }
        state.scramblePreview = [];
        state.scramblePreviewEnabled = true;
        await generation.images.request(
          createImageGenerationConfig({
            scramble,
            scrambleMode,
          })
        );
      }
    ),
    application.bus.subscribe(
      GENERATION_EVENTS.SCRAMBLE_FAILED,
      `${ownerId}:timer-runtime:forget-failed-scramble-request`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        scrambleModesByRequestId.delete(event.payload.requestId);
      }
    ),
    application.bus.subscribe(
      GENERATION_EVENTS.IMAGE_REQUESTED,
      `${ownerId}:timer-runtime:image-requested`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        state.scramblePreviewRequestId = event.id;
      },
      { priority: 100 }
    ),
    application.bus.subscribe(
      GENERATION_EVENTS.IMAGE_GENERATED,
      `${ownerId}:timer-runtime:image-generated`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        if (event.payload.requestId !== state.scramblePreviewRequestId) return;
        state.scramblePreview = [...event.payload.images];
      }
    ),
    application.bus.subscribe(
      GENERATION_EVENTS.IMAGE_FAILED,
      `${ownerId}:timer-runtime:image-failed`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        if (event.payload.requestId !== state.scramblePreviewRequestId) return;
        state.scramblePreview = [];
      }
    ),
  ];
  const runStoppedSubscription: EventSubscription | null = options.getSolveRequest
    ? application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        `${ownerId}:timer-runtime:solve-after-run-stopped`,
        async event => {
          if (event.payload.ownerId !== ownerId) return;
          const solve = options.getSolveRequest?.(
            event.payload.elapsedMs,
            state.penalty,
            event.payload.steps
          );
          if (solve) await publishSolveAddRequest(solve);
        },
        { priority: 100 }
      )
    : null;
  const lifecycleSubscriptions: EventSubscription[] = [];
  if (flags.scramble && options.getScrambleRequest) {
    lifecycleSubscriptions.push(
      application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        `${ownerId}:timer-runtime:scramble-after-stop`,
        async event => {
          if (event.payload.ownerId !== ownerId) return;
          const input = options.getScrambleRequest?.(SCRAMBLE_REQUEST_SOURCES.SOLVE_COMPLETED);
          if (input) await publishScrambleRequest(input);
        }
      ),
      application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_CANCELLED,
        `${ownerId}:timer-runtime:scramble-after-cancel`,
        async event => {
          if (event.payload.ownerId !== ownerId) return;
          if (event.payload.cancelledFrom !== TimerStateValue.RUNNING) return;
          if (state.session?.settings.scrambleAfterCancel !== true) return;
          const input = options.getScrambleRequest?.(SCRAMBLE_REQUEST_SOURCES.RUNNING_CANCELLED);
          if (input) await publishScrambleRequest(input);
        }
      )
    );
  }
  application.deviceManager.registerOwner(ownerId, {
    readonlyView,
    onReading:
      options.onTimerReading ??
      (reading => {
        state.time = reading.timeMs;
      }),
  });

  const keyboard =
    flags.keyboard && application.keyboardDevice
      ? {
          device: application.keyboardDevice,
          boundary: application.keyboardBoundary,
        }
      : null;
  const ready = application.ready;
  let destroyed = false;
  const solveFeatures = new Map<string, InternalSolveFeature>();

  function getSolveFeature(sessionId: string): SolveFeature {
    if (!sessionId) throw new Error("useSolve requires a sessionId");
    let feature = solveFeatures.get(sessionId);
    if (!feature) {
      feature = createSolveFeature({
        bus: application.bus,
        events: application.events,
        ownerId,
        sessionId,
        ready,
      });
      solveFeatures.set(sessionId, feature);
    }
    return feature;
  }

  async function publishScrambleRequest(
    input: ScrambleRequestInput,
    nativeEvent?: NativeTimestampSource
  ): Promise<string> {
    const config: ScrambleGenerationConfig = {
      mode: input.mode,
      count: 1,
      length: input.length,
      probability: input.probability,
      source: input.source,
    };
    if (input.providedScramble !== undefined) config.providedScramble = input.providedScramble;
    const requestId = await generation.scrambles.request(
      config,
      nativeEvent ? { sourceEvent: nativeEvent } : undefined
    );
    scrambleModesByRequestId.set(requestId, input.mode);
    return requestId;
  }

  async function publishSolveAddRequest(
    solve: Partial<Solve>,
    nativeEvent?: NativeTimestampSource
  ): Promise<void> {
    const sessionId = String(solve.session ?? state.session?._id ?? "");
    if (!sessionId) return;
    await getSolveFeature(sessionId).add(solve, nativeEvent);
  }

  return {
    ownerId,
    application,
    state,
    readonlyView,
    bus: application.bus,
    events: application.events,
    generation,
    flags,
    keyboard,
    ready,
    getSolveFeature,
    async requestActiveDevice(deviceId: string): Promise<boolean> {
      await application.ready;
      await application.bus.publish(
        application.events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
          ownerId,
          deviceId,
        })
      );
      return state.activeDeviceId === deviceId;
    },
    async releaseActiveDevice(deviceId: string): Promise<void> {
      await application.ready;
      await application.bus.publish(
        application.events.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED, {
          ownerId,
          deviceId,
        })
      );
    },
    async requestScramble(
      input: ScrambleRequestInput,
      nativeEvent?: NativeTimestampSource
    ): Promise<string> {
      return publishScrambleRequest(input, nativeEvent);
    },
    async requestSolveAdd(
      solve: Partial<Solve>,
      nativeEvent?: NativeTimestampSource
    ): Promise<void> {
      await publishSolveAddRequest(solve, nativeEvent);
    },
    async requestSolveUpdate(solve: Solve, nativeEvent?: NativeTimestampSource): Promise<void> {
      await getSolveFeature(String(solve.session)).update(solve, nativeEvent);
    },
    async requestSolvesRemove(solves: Solve[], nativeEvent?: NativeTimestampSource): Promise<void> {
      if (solves.length === 0) return;
      await getSolveFeature(String(solves[0].session)).remove(solves, nativeEvent);
    },
    async requestSolvesList(
      query: { sessionId: string },
      nativeEvent?: NativeTimestampSource
    ): Promise<Solve[]> {
      const feature = getSolveFeature(String(query.sessionId));
      const result = await feature.load(nativeEvent);
      return result.ok ? [...feature.items] : [];
    },
    cancelActiveInput(timestamp?: number): void {
      application.keyboardDevice?.cancel(timestamp);
    },
    async destroy(): Promise<void> {
      if (destroyed) return;
      destroyed = true;
      await ready;
      await application.bus.publish(
        application.events.create(TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED, { ownerId })
      );
      reactor.destroy();
      scrambleSubscription.unsubscribe();
      for (const subscription of previewSubscriptions) subscription.unsubscribe();
      runStoppedSubscription?.unsubscribe();
      for (const subscription of lifecycleSubscriptions) subscription.unsubscribe();
      generation.destroy();
      for (const feature of solveFeatures.values()) feature.destroy();
      solveFeatures.clear();
      if (ownsApplication) await application.destroy();
    },
  };
}
