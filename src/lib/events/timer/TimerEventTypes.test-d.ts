import { TIMER_EVENTS } from './TimerEventRegistry';
import { TimerEventFactory } from './TimerEventFactory';

const factory = new TimerEventFactory(
  { now: () => 1 },
  { next: () => 'event-id' },
);

factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' });
factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
  ownerId: 'timer:one',
  deviceId: 'keyboard',
  elapsedMs: 1234,
  steps: [500, 734],
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
  reason: 'already-in-use',
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
});

factory.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, {
  devices: [{
    id: 'cubicdb:device:timer_keyboard',
    name: 'Keyboard',
    type: 'timer_keyboard',
    connectionStatus: 'connected',
    activationStatus: 'stopped',
    availability: 'available',
    managementMode: 'managed',
    leaseOwnerId: null,
    capabilities: ['keyboard'],
  }],
});

factory.create(TIMER_EVENTS.LEGACY_DEVICE_CATALOG_SYNC_REQUESTED, {
  devices: [{
    id: 'cubicdb:device:manual_entry',
    name: 'Manual',
    type: 'manual_entry',
    connectionStatus: 'connected',
    capabilities: [],
  }],
});

// @ts-expect-error ACTIVE_DEVICE_CHANGE_REQUESTED requires ownerId.
factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  deviceId: 'cubicdb:device:timer_keyboard',
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
  // @ts-expect-error rejection reason is a closed union.
  reason: 'busy',
});

factory.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, {
  devices: [{
    id: 'cubicdb:device:timer_keyboard',
    name: 'Keyboard',
    type: 'timer_keyboard',
    connectionStatus: 'connected',
    activationStatus: 'stopped',
    availability: 'available',
    managementMode: 'managed',
    leaseOwnerId: null,
    capabilities: [],
    // @ts-expect-error catalog descriptors cannot expose lifecycle methods.
    start: () => {},
  }],
});

// @ts-expect-error DEVICE_READY requires ownerId and deviceId.
factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' });

factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
  ownerId: 'timer:one',
  deviceId: 'keyboard',
  // @ts-expect-error elapsedMs must be a number.
  elapsedMs: '1234',
  steps: [],
});

// @ts-expect-error Unknown event names are rejected.
factory.create('timer.unknown', {});
