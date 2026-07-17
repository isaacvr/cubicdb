import { TIMER_EVENTS } from './TimerEventRegistry';
import { TimerEventFactory } from './TimerEventFactory';
import { SCRAMBLE_REQUEST_SOURCES } from './ScrambleEventTypes';
import {
  DEVICE_LEASE_REJECTION_REASONS,
  TIMER_DEVICE_ACTIVATION_STATUS,
  TIMER_DEVICE_AVAILABILITY,
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_MANAGEMENT_MODE,
  TIMER_DEVICE_NAMES,
  TIMER_DEVICE_TYPES,
} from '$lib/timer/devices/TimerDeviceConstants';

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
  deviceId: TIMER_DEVICE_IDS.KEYBOARD,
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
  ownerId: 'timer:one',
  deviceId: TIMER_DEVICE_IDS.KEYBOARD,
  reason: DEVICE_LEASE_REJECTION_REASONS.ALREADY_IN_USE,
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED, {
  ownerId: 'timer:one',
  deviceId: TIMER_DEVICE_IDS.KEYBOARD,
});

factory.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, {
  devices: [{
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: TIMER_DEVICE_NAMES.KEYBOARD,
    type: TIMER_DEVICE_TYPES.KEYBOARD,
    connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
    activationStatus: TIMER_DEVICE_ACTIVATION_STATUS.STOPPED,
    availability: TIMER_DEVICE_AVAILABILITY.AVAILABLE,
    managementMode: TIMER_DEVICE_MANAGEMENT_MODE.MANAGED,
    leaseOwnerId: null,
    capabilities: [TIMER_DEVICE_CAPABILITIES.KEYBOARD],
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

factory.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, {
  ownerId: 'timer:one',
  mode: '333',
  length: 0,
  probability: [1, 2],
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
});

factory.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED, {
  ownerId: 'timer:one',
  scrambleRequestId: 'scramble-1',
  requestId: 'preview-1',
  images: ['data:image/svg+xml,test'],
  attemptsUsed: 2,
});

// @ts-expect-error scramble results must identify their owner and request.
factory.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
  scramble: 'R U',
  mode: '333',
  length: 0,
  probability: -1,
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
});

factory.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, {
  ownerId: 'timer:one',
  mode: '333',
  length: 0,
  // @ts-expect-error probability is numeric or a numeric list.
  probability: 'OLL',
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
});

// @ts-expect-error ACTIVE_DEVICE_CHANGE_REQUESTED requires ownerId.
factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  deviceId: TIMER_DEVICE_IDS.KEYBOARD,
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
  ownerId: 'timer:one',
  deviceId: TIMER_DEVICE_IDS.KEYBOARD,
  // @ts-expect-error rejection reason is a closed union.
  reason: 'busy',
});

factory.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, {
  devices: [{
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: TIMER_DEVICE_NAMES.KEYBOARD,
    type: TIMER_DEVICE_TYPES.KEYBOARD,
    connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
    activationStatus: TIMER_DEVICE_ACTIVATION_STATUS.STOPPED,
    availability: TIMER_DEVICE_AVAILABILITY.AVAILABLE,
    managementMode: TIMER_DEVICE_MANAGEMENT_MODE.MANAGED,
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
