import { EventBus } from "$lib/events/EventBus";
import { createGenerationClient, type GenerationClient } from "$lib/events/generation";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import {
  TimerEventFactory,
  createApplicationEventBus,
  type IEventIdProvider,
  type IMonotonicClock,
} from "$lib/events/timer/TimerEventFactory";
import { logger } from "$lib/logger/singleton";
import { EventLogger, type EventLogSink } from "$lib/logger/EventLogger";
import { DeviceCatalog } from "./devices/DeviceCatalog.svelte";
import { DeviceManager } from "./devices/DeviceManager";
import type { ITimerDevice } from "./devices/ITimerDevice";
import { KeyboardDevice, type KeyboardDeviceOptions } from "./devices/KeyboardDevice";
import { KeyboardInputBoundary } from "./handlers/KeyboardInputBoundary";
import { CubicDBModuleImageGenerator } from "./scramble/CubicDBModuleImageGenerator";
import { CSTimerScrambleGenerator } from "./scramble/CSTimerScrambleGenerator";
import type { IImageGenerator } from "./scramble/IImageGenerator";
import type { IScrambleGenerator } from "./scramble/IScrambleGenerator";
import { ImageGenerationService } from "./scramble/ImageGenerationService";
import { ScrambleService } from "./scramble/ScrambleService";
import { SolveControllerPersistencePort } from "./solves/SolveControllerPersistencePort";
import {
  SolvePersistenceService,
  type SolvePersistencePort,
} from "./solves/SolvePersistenceService";

export interface TimerApplicationRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: EventLogSink | null;
  devices?: readonly ITimerDevice[];
  keyboardOptions?: KeyboardDeviceOptions;
  scrambleGenerators?: IScrambleGenerator[];
  imageGenerator?: IImageGenerator;
  solvePersistence?: SolvePersistencePort;
}

export interface TimerApplicationRuntime {
  readonly events: TimerEventFactory;
  readonly bus: EventBus<TimerEvent>;
  readonly catalog: DeviceCatalog;
  readonly deviceManager: DeviceManager;
  readonly keyboardDevice: KeyboardDevice | null;
  readonly keyboardBoundary: KeyboardInputBoundary;
  readonly scrambleService: ScrambleService;
  readonly imageGenerationService: ImageGenerationService;
  readonly imageGenerator: IImageGenerator;
  readonly solvePersistenceService: SolvePersistenceService;
  readonly ready: Promise<void>;
  createGenerationClient(scopeId: string): GenerationClient;
  destroy(): Promise<void>;
}

const defaultClock: IMonotonicClock = {
  now: () => performance.now(),
};

const defaultIdProvider: IEventIdProvider = {
  next: () => crypto.randomUUID(),
};

export function createTimerApplicationRuntime(
  options: TimerApplicationRuntimeOptions = {}
): TimerApplicationRuntime {
  const events = new TimerEventFactory(
    options.clock ?? defaultClock,
    options.idProvider ?? defaultIdProvider
  );
  const bus = createApplicationEventBus(events);
  const eventLogger =
    options.eventLogSink === null ? null : new EventLogger(bus, options.eventLogSink ?? logger);
  const catalog = new DeviceCatalog(bus);
  const deviceManager = new DeviceManager(bus, events);
  const keyboardDevice =
    options.devices === undefined
      ? new KeyboardDevice(bus, events, {
          ...options.keyboardOptions,
          clock: options.keyboardOptions?.clock ?? options.clock,
        })
      : null;
  const keyboardBoundary = new KeyboardInputBoundary(bus, events);
  const scrambleService = new ScrambleService(
    bus,
    events,
    options.scrambleGenerators ?? [new CSTimerScrambleGenerator()]
  );
  const imageGenerator = options.imageGenerator ?? new CubicDBModuleImageGenerator();
  const imageGenerationService = new ImageGenerationService(bus, events, imageGenerator);
  const solvePersistenceService = new SolvePersistenceService(
    bus,
    events,
    options.solvePersistence ?? new SolveControllerPersistencePort()
  );
  const devices: readonly ITimerDevice[] =
    options.devices ?? (keyboardDevice ? [keyboardDevice] : []);
  const ready = devices.reduce<Promise<void>>(
    (registration, device) => registration.then(() => deviceManager.registerDevice(device)),
    devices.length === 0 ? deviceManager.initialize() : Promise.resolve()
  );
  let destroyed = false;

  return {
    events,
    bus,
    catalog,
    deviceManager,
    keyboardDevice,
    keyboardBoundary,
    scrambleService,
    imageGenerationService,
    imageGenerator,
    solvePersistenceService,
    ready,
    createGenerationClient(scopeId: string) {
      return createGenerationClient(bus, events, scopeId);
    },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      await ready;
      await deviceManager.destroy();
      solvePersistenceService.destroy();
      imageGenerationService.destroy();
      scrambleService.destroy();
      catalog.destroy();
      eventLogger?.destroy();
    },
  };
}
