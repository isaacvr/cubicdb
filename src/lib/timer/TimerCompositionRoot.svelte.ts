import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import { logger } from '$lib/logger/singleton';
import { TimerEventLogger, type TimerEventLogSink } from '$lib/logger/TimerEventLogger';
import {
  TimerEventFactory,
  type IEventIdProvider,
  type IMonotonicClock,
} from '$lib/events/timer/TimerEventFactory';
import { createTimerMigrationFlags, type TimerMigrationFlags } from './TimerMigrationFlags';
import { TimerReactor } from './TimerReactor';
import { createTimerReadonlyView, type TimerReadonlyView } from './TimerReadonlyView';
import { TimerState } from './TimerState.svelte';
import { KeyboardDevice } from './devices/KeyboardDevice';
import type { TimerReadingCallback } from './devices/ITimerDevice';
import { KeyboardInputBoundary } from './handlers/KeyboardInputBoundary';

export interface TimerRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  flags?: Partial<TimerMigrationFlags>;
  eventLogSink?: TimerEventLogSink | null;
  onTimerReading?: TimerReadingCallback;
}

export interface TimerRuntime {
  state: TimerState;
  readonlyView: TimerReadonlyView;
  bus: TimerEventBus;
  events: TimerEventFactory;
  flags: TimerMigrationFlags;
  keyboard: {
    device: KeyboardDevice;
    boundary: KeyboardInputBoundary;
  } | null;
  destroy(): void;
}

const defaultClock: IMonotonicClock = {
  now: () => performance.now(),
};

const defaultIdProvider: IEventIdProvider = {
  next: () => crypto.randomUUID(),
};

export function createTimerRuntime(options: TimerRuntimeOptions = {}): TimerRuntime {
  const state = new TimerState();
  const events = new TimerEventFactory(
    options.clock ?? defaultClock,
    options.idProvider ?? defaultIdProvider,
  );
  const bus = new TimerEventBus(events);
  const reactor = new TimerReactor(bus, state);
  const eventLogger = options.eventLogSink === null
    ? null
    : new TimerEventLogger(bus, options.eventLogSink ?? logger);
  const readonlyView = createTimerReadonlyView(state);
  const flags = createTimerMigrationFlags(options.flags);
  const keyboard = flags.keyboard
    ? {
        device: new KeyboardDevice(
          bus,
          events,
          readonlyView,
          options.onTimerReading ?? (reading => {
            state.time = reading.elapsedMs;
          }),
          { clock: options.clock },
        ),
        boundary: new KeyboardInputBoundary(bus, events),
      }
    : null;
  keyboard?.device.start();
  let destroyed = false;

  return {
    state,
    readonlyView,
    bus,
    events,
    flags,
    keyboard,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reactor.destroy();
      eventLogger?.destroy();
      keyboard?.device.destroy();
    },
  };
}
