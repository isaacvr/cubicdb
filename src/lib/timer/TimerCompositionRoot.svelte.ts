import type { EventBus, EventSubscription } from '$lib/events/EventBus';
import { TimerState as TimerStateValue, type Penalty } from '@interfaces';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { EventLogSink } from '$lib/logger/EventLogger';
import type {
  IEventIdProvider,
  IMonotonicClock,
  NativeTimestampSource,
  TimerEventFactory,
} from '$lib/events/timer/TimerEventFactory';
import {
  SCRAMBLE_REQUEST_SOURCES,
  type ScrambleRequestInput,
  type ScrambleRequestSource,
} from '$lib/events/timer/ScrambleEventTypes';
import { createTimerMigrationFlags, type TimerMigrationFlags } from './TimerMigrationFlags';
import { TimerReactor } from './TimerReactor';
import { createTimerReadonlyView, type TimerReadonlyView } from './TimerReadonlyView';
import { TimerState } from './TimerState.svelte';
import {
  createTimerApplicationRuntime,
  type TimerApplicationRuntime,
} from './TimerApplicationRuntime';
import type { TimerReadingCallback } from './devices/ITimerDevice';
import type { KeyboardDevice } from './devices/KeyboardDevice';
import type { KeyboardInputBoundary } from './handlers/KeyboardInputBoundary';
import { registerScrambleHandlers } from './handlers/registerScrambleHandlers';

export interface TimerRuntimeOptions {
  application?: TimerApplicationRuntime;
  ownerId?: string;
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: EventLogSink | null;
  flags?: Partial<TimerMigrationFlags>;
  onTimerReading?: TimerReadingCallback;
  onRunStopped?: (elapsedMs: number, penalty: Penalty) => void;
  getScrambleRequest?: (source: ScrambleRequestSource) => ScrambleRequestInput;
}

export interface TimerRuntime {
  readonly ownerId: string;
  readonly application: TimerApplicationRuntime;
  readonly state: TimerState;
  readonly readonlyView: TimerReadonlyView;
  readonly bus: EventBus<TimerEvent>;
  readonly events: TimerEventFactory;
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
    nativeEvent?: NativeTimestampSource,
  ): Promise<string>;
  destroy(): Promise<void>;
}

export function createTimerRuntime(options: TimerRuntimeOptions = {}): TimerRuntime {
  const ownsApplication = options.application === undefined;
  const application = options.application ?? createTimerApplicationRuntime({
    clock: options.clock,
    idProvider: options.idProvider,
    eventLogSink: options.eventLogSink,
  });
  const ownerId = options.ownerId ?? 'timer:local-runtime';
  const state = new TimerState();
  const readonlyView = createTimerReadonlyView(state);
  const flags = createTimerMigrationFlags(options.flags);
  const reactor = new TimerReactor(application.bus, state, ownerId);
  const scrambleSubscription = registerScrambleHandlers(application.bus, state, ownerId);
  const runStoppedSubscription: EventSubscription | null = options.onRunStopped
    ? application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        `${ownerId}:timer-runtime:run-stopped`,
        event => {
          if (event.payload.ownerId !== ownerId) return;
          options.onRunStopped?.(event.payload.elapsedMs, state.penalty);
        },
        { priority: 100 },
      )
    : null;
  const lifecycleSubscriptions: EventSubscription[] = [];
  if (flags.scramble && options.getScrambleRequest) {
    lifecycleSubscriptions.push(
      application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        `${ownerId}:timer-runtime:scramble-after-stop`,
        event => {
          if (event.payload.ownerId !== ownerId) return;
          const input = options.getScrambleRequest?.(SCRAMBLE_REQUEST_SOURCES.SOLVE_COMPLETED);
          if (input) void publishScrambleRequest(input);
        },
      ),
      application.bus.subscribe(
        TIMER_EVENTS.DEVICE_RUN_CANCELLED,
        `${ownerId}:timer-runtime:scramble-after-cancel`,
        event => {
          if (event.payload.ownerId !== ownerId) return;
          if (event.payload.cancelledFrom !== TimerStateValue.RUNNING) return;
          if (state.session?.settings.scrambleAfterCancel !== true) return;
          const input = options.getScrambleRequest?.(SCRAMBLE_REQUEST_SOURCES.RUNNING_CANCELLED);
          if (input) void publishScrambleRequest(input);
        },
      ),
    );
  }
  application.deviceManager.registerOwner(ownerId, {
    readonlyView,
    onReading: options.onTimerReading ?? (reading => {
      state.time = reading.timeMs;
    }),
  });

  const keyboard = flags.keyboard && application.keyboardDevice
    ? {
        device: application.keyboardDevice,
        boundary: application.keyboardBoundary,
      }
    : null;
  const ready = application.ready;
  let destroyed = false;

  async function publishScrambleRequest(
    input: ScrambleRequestInput,
    nativeEvent?: NativeTimestampSource,
  ): Promise<string> {
    const payload = { ownerId, ...input };
    const event = nativeEvent
      ? application.events.fromNative(TIMER_EVENTS.SCRAMBLE_REQUESTED, payload, nativeEvent)
      : application.events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, payload);
    await application.bus.publish(event);
    return event.id;
  }

  return {
    ownerId,
    application,
    state,
    readonlyView,
    bus: application.bus,
    events: application.events,
    flags,
    keyboard,
    ready,
    async requestActiveDevice(deviceId: string): Promise<boolean> {
      await application.ready;
      await application.bus.publish(application.events.create(
        TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
        { ownerId, deviceId },
      ));
      return state.activeDeviceId === deviceId;
    },
    async releaseActiveDevice(deviceId: string): Promise<void> {
      await application.ready;
      await application.bus.publish(application.events.create(
        TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
        { ownerId, deviceId },
      ));
    },
    async requestScramble(
      input: ScrambleRequestInput,
      nativeEvent?: NativeTimestampSource,
    ): Promise<string> {
      return publishScrambleRequest(input, nativeEvent);
    },
    async destroy(): Promise<void> {
      if (destroyed) return;
      destroyed = true;
      await ready;
      await application.bus.publish(application.events.create(
        TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
        { ownerId },
      ));
      reactor.destroy();
      scrambleSubscription.unsubscribe();
      runStoppedSubscription?.unsubscribe();
      for (const subscription of lifecycleSubscriptions) subscription.unsubscribe();
      if (ownsApplication) await application.destroy();
    },
  };
}
