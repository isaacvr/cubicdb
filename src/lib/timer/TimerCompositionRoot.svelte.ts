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

export interface TimerRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  flags?: Partial<TimerMigrationFlags>;
  eventLogSink?: TimerEventLogSink | null;
}

export interface TimerRuntime {
  state: TimerState;
  readonlyView: TimerReadonlyView;
  bus: TimerEventBus;
  events: TimerEventFactory;
  flags: TimerMigrationFlags;
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
  let destroyed = false;

  return {
    state,
    readonlyView,
    bus,
    events,
    flags,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reactor.destroy();
      eventLogger?.destroy();
    },
  };
}
