import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import {
  TimerEventFactory,
  type IEventIdProvider,
  type IMonotonicClock,
} from '$lib/events/timer/TimerEventFactory';
import { logger } from '$lib/logger/singleton';
import { TimerEventLogger, type TimerEventLogSink } from '$lib/logger/TimerEventLogger';
import { DeviceCatalog } from './devices/DeviceCatalog.svelte';
import { DeviceManager } from './devices/DeviceManager';
import type { ITimerDevice } from './devices/ITimerDevice';

export interface TimerApplicationRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: TimerEventLogSink | null;
  devices?: readonly ITimerDevice[];
}

export interface TimerApplicationRuntime {
  readonly events: TimerEventFactory;
  readonly bus: TimerEventBus;
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
  const bus = new TimerEventBus(events);
  const eventLogger = options.eventLogSink === null
    ? null
    : new TimerEventLogger(bus, options.eventLogSink ?? logger);
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
