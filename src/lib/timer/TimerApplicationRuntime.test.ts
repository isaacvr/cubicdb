import { describe, expect, it, vi } from 'vitest';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerApplicationRuntime } from './TimerApplicationRuntime';
import { TIMER_DEVICE_IDS } from './devices/TimerDeviceDescriptor';
import { TimerDeviceTestHarness } from './devices/TimerDeviceTestHarness';

function keyboard(): TimerDeviceTestHarness {
  return new TimerDeviceTestHarness({
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: 'Keyboard',
    type: 'timer_keyboard',
    connectionStatus: 'connected',
    capabilities: ['keyboard'],
  });
}

describe('TimerApplicationRuntime', () => {
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

    expect(runtime.catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.managementMode).toBe('managed');
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
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('supports an application with no registered devices', async () => {
    const info = vi.fn();
    const runtime = createTimerApplicationRuntime({
      clock: { now: () => 25 },
      idProvider: { next: () => 'event-id' },
      eventLogSink: { info },
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
});
