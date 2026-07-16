import { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import {
  TimerEventFactory,
  createApplicationEventBus,
  type IEventIdProvider,
  type IMonotonicClock,
} from '$lib/events/timer/TimerEventFactory';
import { logger } from '$lib/logger/singleton';
import { EventLogger, type EventLogSink } from '$lib/logger/EventLogger';
import { DeviceCatalog } from './devices/DeviceCatalog.svelte';
import { DeviceManager } from './devices/DeviceManager';
import type { ITimerDevice } from './devices/ITimerDevice';

export interface TimerApplicationRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: EventLogSink | null;
  devices?: readonly ITimerDevice[];
}

export interface TimerApplicationRuntime {
  readonly events: TimerEventFactory;
  readonly bus: EventBus<TimerEvent>;
  readonly catalog: DeviceCatalog;
  readonly deviceManager: DeviceManager;
  readonly ready: Promise<void>;
  destroy(): Promise<void>;
}

const defaultClock: IMonotonicClock = {
  now: () => performance.now(),
};

const defaultIdProvider: IEventIdProvider = {
  next: () => crypto.randomUUID(),
};

export function createTimerApplicationRuntime(
  options: TimerApplicationRuntimeOptions = {},
): TimerApplicationRuntime {
  const events = new TimerEventFactory(
    options.clock ?? defaultClock,
    options.idProvider ?? defaultIdProvider,
  );
  const bus = createApplicationEventBus(events);
  const eventLogger = options.eventLogSink === null
    ? null
    : new EventLogger(bus, options.eventLogSink ?? logger);
  const catalog = new DeviceCatalog(bus);
  const deviceManager = new DeviceManager(bus, events);
  const devices = options.devices ?? [];
  const ready = devices.reduce<Promise<void>>(
    (registration, device) => registration.then(() => deviceManager.registerDevice(device)),
    devices.length === 0 ? deviceManager.initialize() : Promise.resolve(),
  );
  let destroyed = false;

  return {
    events,
    bus,
    catalog,
    deviceManager,
    ready,
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      await ready;
      await deviceManager.destroy();
      catalog.destroy();
      eventLogger?.destroy();
    },
  };
}
