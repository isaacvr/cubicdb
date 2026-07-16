import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerState as TimerStateValue } from '@interfaces';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
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

function fakeDevice(id: string, name: string, timeline?: string[]): TimerDeviceTestHarness {
  return new TimerDeviceTestHarness({
    id,
    name,
    type: id,
    connectionStatus: 'connected',
    capabilities: [],
  }, timeline);
}

describe('DeviceManager leases', () => {
  let bus: EventBus<TimerEvent>;
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
    bus = createApplicationEventBus(events);
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

  it('publishes an immutable catalog event snapshot', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const snapshots: ReadonlyArray<unknown>[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, 'test:immutable-catalog', event => {
      snapshots.push(event.payload.devices);
    });

    await manager.registerDevice(keyboard);

    const snapshot = snapshots.at(-1) as ReadonlyArray<{
      capabilities: readonly string[];
    }>;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0].capabilities)).toBe(true);
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

  it('stops the previous device before starting the next without disconnecting it', async () => {
    const timeline: string[] = [];
    const first = fakeDevice('device:first', 'First', timeline);
    const second = fakeDevice('device:second', 'Second', timeline);
    await manager.registerDevice(first);
    await manager.registerDevice(second);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: first.descriptor.id,
    }));
    timeline.length = 0;

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: second.descriptor.id,
    }));

    expect(timeline).toEqual([
      'device:first:stop',
      'device:second:start:timer:one',
    ]);
    expect(first.calls).not.toContain('disconnect');
    expect(catalog.find(first.descriptor.id)).toMatchObject({
      activationStatus: 'stopped',
      availability: 'available',
      leaseOwnerId: null,
    });
  });

  it('aborts a switch and quarantines the previous device when stop fails', async () => {
    const first = fakeDevice('device:first', 'First');
    const second = fakeDevice('device:second', 'Second');
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, 'test:stop-rejected', rejected);
    await manager.registerDevice(first);
    await manager.registerDevice(second);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: first.descriptor.id,
    }));
    first.stopError = new Error('stop failed');

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: second.descriptor.id,
    }));

    expect(second.calls).not.toContain('start:timer:one');
    expect(rejected.mock.calls.at(-1)?.[0].payload.reason).toBe('stop-failed');
    expect(catalog.find(first.descriptor.id)).toMatchObject({
      activationStatus: 'error',
      availability: 'unavailable',
      leaseOwnerId: 'timer:one',
    });
    expect(catalog.find(second.descriptor.id)?.availability).toBe('available');
  });

  it('restarts the previous device when the requested device fails to start', async () => {
    const first = fakeDevice('device:first', 'First');
    const second = fakeDevice('device:second', 'Second');
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, 'test:start-rejected', rejected);
    await manager.registerDevice(first);
    await manager.registerDevice(second);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: first.descriptor.id,
    }));
    second.startError = new Error('start failed');

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: second.descriptor.id,
    }));

    expect(first.calls).toEqual(['start:timer:one', 'stop', 'start:timer:one']);
    expect(rejected.mock.calls.at(-1)?.[0].payload.reason).toBe('start-failed');
    expect(catalog.find(first.descriptor.id)).toMatchObject({
      activationStatus: 'active',
      availability: 'in-use',
      leaseOwnerId: 'timer:one',
    });
    expect(catalog.find(second.descriptor.id)).toMatchObject({
      activationStatus: 'error',
      availability: 'unavailable',
      leaseOwnerId: null,
    });
  });

  it('keeps a failed recovery device unavailable', async () => {
    const first = fakeDevice('device:first', 'First');
    const second = fakeDevice('device:second', 'Second');
    await manager.registerDevice(first);
    await manager.registerDevice(second);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: first.descriptor.id,
    }));
    first.startError = new Error('restart failed');
    second.startError = new Error('start failed');

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: second.descriptor.id,
    }));

    expect(catalog.find(first.descriptor.id)).toMatchObject({
      activationStatus: 'error',
      availability: 'unavailable',
      leaseOwnerId: 'timer:one',
    });
  });

  it('stops and releases an active device', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const released = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_RELEASED, 'test:released', released);
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    expect(keyboard.calls).toEqual(['start:timer:one', 'stop']);
    expect(released).toHaveBeenCalledOnce();
    expect(catalog.find(keyboard.descriptor.id)).toMatchObject({
      activationStatus: 'stopped',
      availability: 'available',
      leaseOwnerId: null,
    });
  });

  it('retains and quarantines a lease when release stop fails', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const rejected = vi.fn();
    bus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REJECTED, 'test:release-rejected', rejected);
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));
    keyboard.stopError = new Error('stop failed');

    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    expect(rejected).toHaveBeenCalledOnce();
    expect(catalog.find(keyboard.descriptor.id)).toMatchObject({
      activationStatus: 'error',
      availability: 'unavailable',
      leaseOwnerId: 'timer:one',
    });
  });

  it('stops, releases, and explicitly disconnects a leased device', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading: vi.fn() });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    await bus.publish(events.create(TIMER_EVENTS.DEVICE_DISCONNECT_REQUESTED, {
      deviceId: keyboard.descriptor.id,
    }));

    expect(keyboard.calls).toEqual(['start:timer:one', 'stop', 'disconnect']);
    expect(catalog.find(keyboard.descriptor.id)).toMatchObject({
      connectionStatus: 'disconnected',
      activationStatus: 'stopped',
      availability: 'unavailable',
      leaseOwnerId: null,
    });
  });

  it('publishes disconnect failure and leaves the device unavailable', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const failed = vi.fn();
    bus.subscribe(TIMER_EVENTS.DEVICE_DISCONNECT_FAILED, 'test:disconnect-failed', failed);
    await manager.registerDevice(keyboard);
    keyboard.disconnectError = new Error('disconnect failed');

    await bus.publish(events.create(TIMER_EVENTS.DEVICE_DISCONNECT_REQUESTED, {
      deviceId: keyboard.descriptor.id,
    }));

    expect(failed).toHaveBeenCalledOnce();
    expect(catalog.find(keyboard.descriptor.id)).toMatchObject({
      connectionStatus: 'error',
      availability: 'unavailable',
    });
  });

  it('destroys an owner lease and drops later readings', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    const onReading = vi.fn();
    await manager.registerDevice(keyboard);
    manager.registerOwner('timer:one', { readonlyView, onReading });
    await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
      ownerId: 'timer:one',
      deviceId: keyboard.descriptor.id,
    }));

    await bus.publish(events.create(TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED, {
      ownerId: 'timer:one',
    }));
    keyboard.emitReading({ timestamp: 200, elapsedMs: 100 });

    expect(keyboard.calls).toEqual(['start:timer:one', 'stop']);
    expect(onReading).not.toHaveBeenCalled();
    expect(catalog.find(keyboard.descriptor.id)?.leaseOwnerId).toBeNull();
  });

  it('destroys subscriptions and devices idempotently', async () => {
    const keyboard = fakeDevice(TIMER_DEVICE_IDS.KEYBOARD, 'Keyboard');
    await manager.registerDevice(keyboard);

    await manager.destroy();
    await manager.destroy();

    expect(keyboard.calls).toEqual(['destroy']);
  });
});
