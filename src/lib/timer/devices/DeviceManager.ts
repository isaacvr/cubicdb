import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { ITimerDevice } from './ITimerDevice';
import type {
  DeviceLeaseRejectionReason,
  TimerDeviceActivationContext,
  TimerDeviceActivationStatus,
  TimerDeviceAvailability,
  TimerDeviceConnectionStatus,
  TimerDeviceDescriptor,
  TimerDeviceOwnerBinding,
} from './TimerDeviceDescriptor';

interface ManagedDeviceRecord {
  readonly device: ITimerDevice;
  connectionStatus: TimerDeviceConnectionStatus;
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
  private readonly subscriptions: EventSubscription[];
  private destroyed = false;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
  ) {
    this.subscriptions = [
      bus.subscribe(
        TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
        'device-manager:active-change',
        event => this.changeActiveDevice(event.payload.ownerId, event.payload.deviceId),
      ),
      bus.subscribe(
        TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
        'device-manager:active-release',
        event => this.releaseActiveDevice(event.payload.ownerId, event.payload.deviceId),
      ),
      bus.subscribe(
        TIMER_EVENTS.DEVICE_DISCONNECT_REQUESTED,
        'device-manager:disconnect',
        event => this.disconnectDevice(event.payload.deviceId),
      ),
      bus.subscribe(
        TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
        'device-manager:owner-destroy',
        event => this.destroyOwner(event.payload.ownerId),
      ),
    ];
  }

  async registerDevice(device: ITimerDevice): Promise<void> {
    this.devices.set(device.descriptor.id, {
      device,
      connectionStatus: device.descriptor.connectionStatus,
      activationStatus: 'stopped',
      availability: 'available',
      leaseOwnerId: null,
    });
    await this.publishCatalog();
  }

  registerOwner(ownerId: string, binding: TimerDeviceOwnerBinding): void {
    this.owners.set(ownerId, binding);
  }

  initialize(): Promise<void> {
    return this.publishCatalog();
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
        try {
          await previous.device.stop();
        } catch {
          previous.activationStatus = 'error';
          previous.availability = 'unavailable';
          target.activationStatus = 'stopped';
          target.availability = 'available';
          this.reservations.delete(deviceId);
          await this.rejectChange(ownerId, deviceId, 'stop-failed');
          await this.publishCatalog();
          return;
        }
      }
    }

    const activation = this.activationFor(ownerId, binding);
    try {
      await target.device.start(activation);
    } catch {
      target.activationStatus = 'error';
      target.availability = 'unavailable';
      this.reservations.delete(deviceId);

      if (previousDeviceId) {
        const previous = this.devices.get(previousDeviceId);
        if (previous) {
          try {
            await previous.device.start(activation);
            previous.activationStatus = 'active';
            previous.availability = 'in-use';
          } catch {
            previous.activationStatus = 'error';
            previous.availability = 'unavailable';
          }
        }
      }

      await this.rejectChange(ownerId, deviceId, 'start-failed');
      await this.publishCatalog();
      return;
    }

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

  private async releaseActiveDevice(ownerId: string, deviceId: string): Promise<void> {
    if (this.leasesByOwner.get(ownerId) !== deviceId) return;
    const record = this.devices.get(deviceId);
    if (!record) return;

    record.activationStatus = 'stopping';
    try {
      await record.device.stop();
    } catch {
      record.activationStatus = 'error';
      record.availability = 'unavailable';
      await this.bus.publish(this.events.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REJECTED, {
        ownerId,
        deviceId,
        reason: 'stop-failed',
      }));
      await this.publishCatalog();
      return;
    }

    this.clearLease(ownerId, deviceId);
    record.activationStatus = 'stopped';
    record.availability = record.connectionStatus === 'connected' ? 'available' : 'unavailable';
    await this.bus.publish(this.events.create(TIMER_EVENTS.ACTIVE_DEVICE_RELEASED, {
      ownerId,
      deviceId,
    }));
    await this.publishCatalog();
  }

  private async disconnectDevice(deviceId: string): Promise<void> {
    const record = this.devices.get(deviceId);
    if (!record) return;
    const ownerId = this.ownersByDevice.get(deviceId) ?? null;

    if (ownerId) {
      record.activationStatus = 'stopping';
      try {
        await record.device.stop();
      } catch {
        record.activationStatus = 'error';
        record.availability = 'unavailable';
        await this.publishDisconnectFailed(deviceId);
        await this.publishCatalog();
        return;
      }
      this.clearLease(ownerId, deviceId);
    }

    try {
      await record.device.disconnect();
    } catch {
      record.connectionStatus = 'error';
      record.activationStatus = 'error';
      record.availability = 'unavailable';
      await this.publishDisconnectFailed(deviceId);
      await this.publishCatalog();
      return;
    }

    record.connectionStatus = 'disconnected';
    record.activationStatus = 'stopped';
    record.availability = 'unavailable';
    record.leaseOwnerId = null;
    await this.bus.publish(this.events.create(TIMER_EVENTS.DEVICE_DISCONNECTED, { deviceId }));
    await this.publishCatalog();
  }

  private async destroyOwner(ownerId: string): Promise<void> {
    const deviceId = this.leasesByOwner.get(ownerId) ?? null;
    this.owners.delete(ownerId);
    if (deviceId) await this.releaseActiveDevice(ownerId, deviceId);
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

  private activationFor(
    ownerId: string,
    binding: TimerDeviceOwnerBinding,
  ): TimerDeviceActivationContext {
    return {
      ownerId,
      readonlyView: binding.readonlyView,
      onReading: reading => this.owners.get(ownerId)?.onReading(reading),
    };
  }

  private clearLease(ownerId: string, deviceId: string): void {
    this.leasesByOwner.delete(ownerId);
    this.ownersByDevice.delete(deviceId);
    const record = this.devices.get(deviceId);
    if (record) record.leaseOwnerId = null;
  }

  private async publishDisconnectFailed(deviceId: string): Promise<void> {
    await this.bus.publish(this.events.create(TIMER_EVENTS.DEVICE_DISCONNECT_FAILED, {
      deviceId,
      reason: 'disconnect-failed',
    }));
  }

  private descriptor(record: ManagedDeviceRecord): TimerDeviceDescriptor {
    return Object.freeze({
      ...record.device.descriptor,
      connectionStatus: record.connectionStatus,
      capabilities: Object.freeze([...record.device.descriptor.capabilities]),
      activationStatus: record.activationStatus,
      availability: record.availability,
      managementMode: 'managed',
      leaseOwnerId: record.leaseOwnerId,
    });
  }

  private async publishCatalog(): Promise<void> {
    const devices = Object.freeze(
      [...this.devices.values()].map(record => this.descriptor(record)),
    );
    await this.bus.publish(this.events.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, { devices }));
  }
}
