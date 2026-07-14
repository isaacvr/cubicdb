import type { TimerReadonlyView } from '../TimerReadonlyView';
import type { TimerReadingCallback } from './ITimerDevice';

export const TIMER_DEVICE_IDS = {
  KEYBOARD: 'cubicdb:device:timer_keyboard',
} as const;

export type TimerDeviceConnectionStatus = 'connected' | 'disconnected' | 'error';
export type TimerDeviceActivationStatus = 'stopped' | 'starting' | 'active' | 'stopping' | 'error';
export type TimerDeviceAvailability = 'available' | 'in-use' | 'unavailable';
export type TimerDeviceManagementMode = 'managed' | 'legacy';

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

export type DeviceLeaseRejectionReason =
  | 'device-not-found'
  | 'already-in-use'
  | 'incompatible-device'
  | 'start-failed'
  | 'stop-failed'
  | 'owner-not-registered';
