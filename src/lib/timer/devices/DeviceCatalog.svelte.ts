import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerDeviceDescriptor } from './TimerDeviceDescriptor';

function immutableDescriptor(device: TimerDeviceDescriptor): TimerDeviceDescriptor {
  return Object.freeze({
    ...device,
    capabilities: Object.freeze([...device.capabilities]),
  });
}

export class DeviceCatalog {
  devices: readonly TimerDeviceDescriptor[] = $state([]);
  private subscription: EventSubscription | null;

  constructor(bus: IEventBus<TimerEvent>) {
    this.subscription = bus.subscribe(
      TIMER_EVENTS.DEVICE_CATALOG_UPDATED,
      'device-catalog:replace',
      event => {
        this.devices = Object.freeze(event.payload.devices.map(immutableDescriptor));
      },
    );
  }

  find(deviceId: string): TimerDeviceDescriptor | undefined {
    return this.devices.find(device => device.id === deviceId);
  }

  destroy(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}
