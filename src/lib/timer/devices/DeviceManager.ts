import type { ITimerEventBus } from '$lib/events/timer/TimerEventBus';
import type { TimerEventSubscription } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { ITimerDevice } from './ITimerDevice';
import type {
  DeviceLeaseRejectionReason,
  TimerDeviceActivationContext,
  TimerDeviceActivationStatus,
  TimerDeviceAvailability,
  TimerDeviceDescriptor,
  TimerDeviceOwnerBinding,
} from './TimerDeviceDescriptor';

interface ManagedDeviceRecord {
  readonly device: ITimerDevice;
  activationStatus: TimerDeviceActivationStatus;
  availability: TimerDeviceAvailability;
  leaseOwnerId: string | null;
}

export class DeviceManager {
  private readonly devices = new Map<string, ManagedDeviceRecord>();
  private readonly owners = new Map<string, TimerDeviceOwnerBinding>();
  private readonly leasesByOwner = new Map<string, string>();
  private readonly ownersByDevice = new Map<string, string>();
  private readonly reservations = new Map<string, string>();
  private readonly subscriptions: TimerEventSubscription[];
  private destroyed = false;

  constructor(
    private readonly bus: ITimerEventBus,
    private readonly events: TimerEventFactory,
  ) {
    this.subscriptions = [
      bus.subscribe(
        TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
        'device-manager:active-change',
        event => this.changeActiveDevice(event.payload.ownerId, event.payload.deviceId),
      ),
    ];
  }

  async registerDevice(device: ITimerDevice): Promise<void> {
    this.devices.set(device.descriptor.id, {
      device,
      activationStatus: 'stopped',
      availability: 'available',
      leaseOwnerId: null,
    });
    await this.publishCatalog();
  }

  registerOwner(ownerId: string, binding: TimerDeviceOwnerBinding): void {
    this.owners.set(ownerId, binding);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    for (const record of this.devices.values()) await record.device.destroy();
    this.devices.clear();
    this.owners.clear();
    this.leasesByOwner.clear();
    this.ownersByDevice.clear();
    this.reservations.clear();
  }

  private async changeActiveDevice(ownerId: string, deviceId: string): Promise<void> {
    const binding = this.owners.get(ownerId);
    if (!binding) {
      await this.rejectChange(ownerId, deviceId, 'owner-not-registered');
      return;
    }

    const target = this.devices.get(deviceId);
    if (!target) {
      await this.rejectChange(ownerId, deviceId, 'device-not-found');
      return;
    }

    const previousDeviceId = this.leasesByOwner.get(ownerId) ?? null;
    if (previousDeviceId === deviceId) {
      await this.publishChanged(ownerId, deviceId, previousDeviceId);
      return;
    }

    const currentOwner = this.ownersByDevice.get(deviceId) ?? this.reservations.get(deviceId);
    if (currentOwner && currentOwner !== ownerId) {
      await this.rejectChange(ownerId, deviceId, 'already-in-use');
      return;
    }

    this.reservations.set(deviceId, ownerId);
    target.activationStatus = 'starting';
    target.availability = 'unavailable';

    if (previousDeviceId) {
      const previous = this.devices.get(previousDeviceId);
      if (previous) {
        previous.activationStatus = 'stopping';
        await previous.device.stop();
      }
    }

    const activation: TimerDeviceActivationContext = {
      ownerId,
      readonlyView: binding.readonlyView,
      onReading: reading => this.owners.get(ownerId)?.onReading(reading),
    };
    await target.device.start(activation);

    if (previousDeviceId) {
      const previous = this.devices.get(previousDeviceId);
      if (previous) {
        previous.activationStatus = 'stopped';
        previous.availability = 'available';
        previous.leaseOwnerId = null;
      }
      this.ownersByDevice.delete(previousDeviceId);
    }

    this.leasesByOwner.set(ownerId, deviceId);
    this.ownersByDevice.set(deviceId, ownerId);
    this.reservations.delete(deviceId);
    target.activationStatus = 'active';
    target.availability = 'in-use';
    target.leaseOwnerId = ownerId;

    await this.publishChanged(ownerId, deviceId, previousDeviceId);
    await this.publishCatalog();
  }

  private async rejectChange(
    ownerId: string,
    deviceId: string,
    reason: DeviceLeaseRejectionReason,
  ): Promise<void> {
    await this.bus.publish(this.events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
      ownerId,
      deviceId,
      reason,
    }));
  }

  private async publishChanged(
    ownerId: string,
    deviceId: string,
    previousDeviceId: string | null,
  ): Promise<void> {
    await this.bus.publish(this.events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGED, {
      ownerId,
      previousDeviceId,
      deviceId,
    }));
  }

  private descriptor(record: ManagedDeviceRecord): TimerDeviceDescriptor {
    return {
      ...record.device.descriptor,
      capabilities: [...record.device.descriptor.capabilities],
      activationStatus: record.activationStatus,
      availability: record.availability,
      managementMode: 'managed',
      leaseOwnerId: record.leaseOwnerId,
    };
  }

  private async publishCatalog(): Promise<void> {
    const devices = [...this.devices.values()].map(record => this.descriptor(record));
    await this.bus.publish(this.events.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, { devices }));
  }
}
