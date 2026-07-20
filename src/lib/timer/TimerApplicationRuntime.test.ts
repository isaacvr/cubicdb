import { describe, expect, it, vi } from 'vitest';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerApplicationRuntime } from './TimerApplicationRuntime';
import {
  TIMER_DEVICE_AVAILABILITY,
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_MANAGEMENT_MODE,
  TIMER_DEVICE_TYPES,
} from './devices/TimerDeviceDescriptor';
import { TimerDeviceTestHarness } from './devices/TimerDeviceTestHarness';
import { KeyboardInputBoundary } from './handlers/KeyboardInputBoundary';
import type { IScrambleGenerator } from './scramble/IScrambleGenerator';
import { CubicDBModuleImageGenerator } from './scramble/CubicDBModuleImageGenerator';
import type { IImageGenerator } from './scramble/IImageGenerator';
import { ImageGenerationService } from './scramble/ImageGenerationService';
import { ScrambleService } from './scramble/ScrambleService';
import { SolvePersistenceService, type SolvePersistencePort } from './solves/SolvePersistenceService';

function keyboard(): TimerDeviceTestHarness {
  return new TimerDeviceTestHarness({
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: 'Keyboard',
    type: TIMER_DEVICE_TYPES.KEYBOARD,
    connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
    capabilities: [TIMER_DEVICE_CAPABILITIES.KEYBOARD],
  });
}

describe('TimerApplicationRuntime', () => {
  it('owns one injectable application-scoped scramble service', async () => {
    const generator: IScrambleGenerator = {
      id: 'test',
      supports: () => true,
      generate: vi.fn(() => 'R U'),
    };
    const runtime = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      scrambleGenerators: [generator],
    });

    expect(runtime.scrambleService).toBeInstanceOf(ScrambleService);
    await runtime.destroy();
  });

  it('creates scope-bound generation clients', async () => {
    const runtime = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
    });
    const client = runtime.createGenerationClient('timer:1');

    expect(client.scopeId).toBe('timer:1');

    client.destroy();
    await runtime.destroy();
  });

  it('owns one injectable application-scoped image generation service', async () => {
    const imageGenerator: IImageGenerator = {
      supports: () => true,
      generate: vi.fn(async () => ['svg']),
    };
    const runtime = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      imageGenerator,
    });

    expect(runtime.imageGenerationService).toBeInstanceOf(ImageGenerationService);
    await runtime.destroy();
  });

  it('uses cubicdb-module as the default image generator', async () => {
    const runtime = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
    });

    expect(runtime.imageGenerator).toBeInstanceOf(CubicDBModuleImageGenerator);
    await runtime.destroy();
  });

  it('owns one injectable application-scoped solve persistence service', async () => {
    const solvePersistence: SolvePersistencePort = {
      loadSolves: vi.fn(),
      addSolve: vi.fn(),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(),
    };
    const runtime = createTimerApplicationRuntime({
      eventLogSink: null,
      devices: [],
      solvePersistence,
    });

    expect(runtime.solvePersistenceService).toBeInstanceOf(SolvePersistenceService);
    await runtime.destroy();
  });

  it('composes one bus, factory, catalog, manager, and logger', async () => {
    const info = vi.fn();
    const device = keyboard();
    let id = 0;
    const runtime = createTimerApplicationRuntime({
      clock: { now: () => 25 },
      idProvider: { next: () => `event-${++id}` },
      eventLogSink: { info },
      devices: [device],
    });

    await runtime.ready;

    expect(runtime.catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.managementMode)
      .toBe(TIMER_DEVICE_MANAGEMENT_MODE.MANAGED);
    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_DISCOVERED, {
      deviceId: 'device:other',
      name: 'Other',
      kind: 'test',
    }));
    expect(info).toHaveBeenCalledWith(
      'event',
      TIMER_EVENTS.DEVICE_DISCOVERED,
      expect.objectContaining({ id: expect.any(String), timestamp: 25 }),
    );

    await runtime.destroy();
  });

  it('resolves an empty application and destroys owned services idempotently', async () => {
    const info = vi.fn();
    const device = keyboard();
    const runtime = createTimerApplicationRuntime({
      clock: { now: () => 25 },
      idProvider: { next: () => 'event-id' },
      eventLogSink: { info },
      devices: [device],
    });
    await runtime.ready;

    await runtime.destroy();
    await runtime.destroy();
    await runtime.bus.publish(runtime.events.create(TIMER_EVENTS.DEVICE_DISCOVERED, {
      deviceId: 'device:after-destroy',
      name: 'After',
      kind: 'test',
    }));

    expect(device.calls).toEqual(['destroy']);
    expect(info.mock.calls.filter(call => call[0] === 'event')).toHaveLength(1);
  });

  it('supports an application with no registered devices', async () => {
    const info = vi.fn();
    const runtime = createTimerApplicationRuntime({
      clock: { now: () => 25 },
      idProvider: { next: () => 'event-id' },
      eventLogSink: { info },
      devices: [],
    });

    await runtime.ready;

    expect(runtime.catalog.devices).toEqual([]);
    expect(info).toHaveBeenCalledWith(
      'event',
      TIMER_EVENTS.DEVICE_CATALOG_UPDATED,
      expect.objectContaining({ payload: { devices: [] } }),
    );
    await runtime.destroy();
  });

  it('owns and registers the managed keyboard by default', async () => {
    const runtime = createTimerApplicationRuntime({ eventLogSink: null });

    await runtime.ready;

    expect(runtime.keyboardDevice?.descriptor.id).toBe(TIMER_DEVICE_IDS.KEYBOARD);
    expect(runtime.keyboardBoundary).toBeInstanceOf(KeyboardInputBoundary);
    expect(runtime.catalog.find(TIMER_DEVICE_IDS.KEYBOARD)).toMatchObject({
      managementMode: TIMER_DEVICE_MANAGEMENT_MODE.MANAGED,
      availability: TIMER_DEVICE_AVAILABILITY.AVAILABLE,
    });
    await runtime.destroy();
  });
});
