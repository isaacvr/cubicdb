import { beforeEach, describe, expect, it } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { DeviceCatalog } from './DeviceCatalog.svelte';
import {
  TIMER_DEVICE_ACTIVATION_STATUS,
  TIMER_DEVICE_AVAILABILITY,
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_MANAGEMENT_MODE,
  TIMER_DEVICE_TYPES,
  type TimerDeviceDescriptor,
} from './TimerDeviceDescriptor';

function keyboardDescriptor(
  overrides: Partial<TimerDeviceDescriptor> = {},
): TimerDeviceDescriptor {
  return {
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: 'Keyboard',
    type: TIMER_DEVICE_TYPES.KEYBOARD,
    connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
    activationStatus: TIMER_DEVICE_ACTIVATION_STATUS.STOPPED,
    availability: TIMER_DEVICE_AVAILABILITY.AVAILABLE,
    managementMode: TIMER_DEVICE_MANAGEMENT_MODE.MANAGED,
    leaseOwnerId: null,
    capabilities: [TIMER_DEVICE_CAPABILITIES.KEYBOARD],
    ...overrides,
  };
}

describe('DeviceCatalog', () => {
  let bus: EventBus<TimerEvent>;
  let events: TimerEventFactory;

  beforeEach(() => {
    events = new TimerEventFactory(
      { now: () => 10 },
      { next: () => 'event-id' },
    );
    bus = createApplicationEventBus(events);
  });

  it('starts with an empty snapshot', () => {
    const catalog = new DeviceCatalog(bus);

    expect(catalog.devices).toEqual([]);
  });

  it('replaces the catalog from immutable event snapshots', async () => {
    const catalog = new DeviceCatalog(bus);
    const descriptor = keyboardDescriptor();
    const source = [descriptor];

    await bus.publish(events.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, { devices: source }));
    source[0] = keyboardDescriptor({ availability: TIMER_DEVICE_AVAILABILITY.UNAVAILABLE });
    (descriptor.capabilities as string[]).push('mutated');

    expect(catalog.devices).toEqual([keyboardDescriptor()]);
    expect(Object.isFrozen(catalog.devices)).toBe(true);
    expect(Object.isFrozen(catalog.devices[0])).toBe(true);
    expect(Object.isFrozen(catalog.devices[0].capabilities)).toBe(true);
    expect(catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.name).toBe('Keyboard');
  });

  it('stops projecting after destroy', async () => {
    const catalog = new DeviceCatalog(bus);
    catalog.destroy();
    catalog.destroy();

    await bus.publish(events.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, {
      devices: [keyboardDescriptor()],
    }));

    expect(catalog.devices).toEqual([]);
  });
});
