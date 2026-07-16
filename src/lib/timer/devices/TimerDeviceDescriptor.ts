import type { TimerReadonlyView } from '../TimerReadonlyView';
import type { TimerReadingCallback } from './ITimerDevice';
import type {
  DeviceLeaseRejectionReason,
  TimerDeviceActivationStatus,
  TimerDeviceAvailability,
  TimerDeviceConnectionStatus,
  TimerDeviceManagementMode,
} from './TimerDeviceConstants';

export * from './TimerDeviceConstants';

export interface TimerDeviceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly connectionStatus: TimerDeviceConnectionStatus;
  readonly activationStatus: TimerDeviceActivationStatus;
  readonly availability: TimerDeviceAvailability;
  readonly managementMode: TimerDeviceManagementMode;
  readonly leaseOwnerId: string | null;
  readonly capabilities: readonly string[];
}

export type LegacyTimerDeviceDescriptor = Omit<
  TimerDeviceDescriptor,
  'activationStatus' | 'availability' | 'managementMode' | 'leaseOwnerId'
>;

export interface TimerDeviceOwnerBinding {
  readonly readonlyView: TimerReadonlyView;
  readonly onReading: TimerReadingCallback;
}

export interface TimerDeviceActivationContext extends TimerDeviceOwnerBinding {
  readonly ownerId: string;
}

export type { DeviceLeaseRejectionReason };
