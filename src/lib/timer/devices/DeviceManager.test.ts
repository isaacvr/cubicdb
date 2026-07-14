import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerState as TimerStateValue } from '@interfaces';
import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerReadonlyView } from '../TimerReadonlyView';
import { DeviceCatalog } from './DeviceCatalog.svelte';
import { DeviceManager } from './DeviceManager';
import { TIMER_DEVICE_IDS } from './TimerDeviceDescriptor';
import { TimerDeviceTestHarness } from './TimerDeviceTestHarness';

const readonlyView: TimerReadonlyView = {
  state: TimerStateValue.CLEAN,
  session: null,
  scramble: '',
};

function fakeDevice(id: string, name: string): TimerDeviceTestHarness {
  return new TimerDeviceTestHarness({
    id,
    name,
    type: id,
    connectionStatus: 'connected',
    capabilities: [],
  });
}

describe('DeviceManager leases', () => {
  let bus: TimerEventBus;
  let events: TimerEventFactory;
  let catalog: DeviceCatalog;
  let manager: DeviceManager;
  let nextId: number;

  beforeEach(() => {
    nextId = 0;
    events = new TimerEventFactory(
      { now: () => 100 },
      { next: () => `event-${++nextId}` },
    );
    bus = new TimerEventBus(events);
    catalog = new DeviceCatalog(bus);
    manager = new DeviceManager(bus, events);
  });

  afterEach(async () => {
    await manager.destroy();
    catalog.destroy();
  });

  it('publishes a complete managed descriptor when registering a device', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');

    await manager.registerDevice(keyboard);

    expect(catalog.devices).toEqual([{
      ...keyboard.descriptor,
      activationStatus: 'stopped',
      availability: 'available',
      managementMode: 'managed',
      leaseOwnerId: null,
    }]);
  });

  it('leases a device to a registered owner', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const changed = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGED, 'test:changed', changed);
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    expect(keyboard.calls).toEqual(['start:timer:one']);
    expect(catalog.find(keyboard.descriptor.id)).toMatchObject({
      activationStatus: 'active',
      availability: 'in-use',
      leaseOwnerId: 'timer:one',
    });
    expect(changed).toHaveBeenCalledOnce();
    expect(changed.mock.calls[0][0].payload).toEqual({
      ownerId: 'timer:one',
      previousDeviceId: null,
      deviceId: keyboard.descriptor.id,
    });
  });

  it('treats selecting the current device as an idempotent success', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    const request = () => bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    await request();
    await request();

    expect(keyboard.calls).toEqual(['start:timer:one']);
  });

  it('rejects a device leased by another owner without transferring it', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, 'test:rejected', rejected);
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    manager.registerOwner('timer:two', { readonlyView, onReading: vi.fn() });

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:two',
      deviceId: keyboard.descriptor.id,
    }));

    expect(keyboard.calls).toEqual(['start:timer:one']);
    expect(catalog.find(keyboard.descriptor.id)?.leaseOwnerId).toBe('timer:one');
    expect(rejected).toHaveBeenCalledOnce();
    expect(rejected.mock.calls[0][0].payload.reason).toBe('already-in-use');
  });

  it('rejects an unregistered owner without starting the device', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, 'test:owner-rejected', rejected);
    await manager.registerDevice(keyboard);

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:missing',
      deviceId: keyboard.descriptor.id,
    }));

    expect(keyboard.calls).toEqual([]);
    expect(rejected.mock.calls[0][0].payload.reason).toBe('owner-not-registered');
  });

  it('rejects an unknown managed device', async () => {
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, 'test:device-rejected', rejected);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: 'device:missing',
    }));

    expect(rejected.mock.calls[0][0].payload.reason).toBe('device-not-found');
  });

  it('allows different owners to lease different devices', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const second = fakeDevice('device:second', 'Second');
    await manager.registerDevice(keyboard);
    await manager.registerDevice(second);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    manager.registerOwner('timer:two', { readonlyView, onReading: vi.fn() });

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:two',
      deviceId: second.descriptor.id,
    }));

    expect(catalog.find(keyboard.descriptor.id)?.leaseOwnerId).toBe('timer:one');
    expect(catalog.find(second.descriptor.id)?.leaseOwnerId).toBe('timer:two');
  });
});
