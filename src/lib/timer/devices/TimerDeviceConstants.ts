type ValueOf<T> = T[keyof T];

export const TIMER_DEVICE_IDS = {
  KEYBOARD: 'cubicdb:device:timer_keyboard',
} as const;

export const TIMER_DEVICE_TYPES = {
  KEYBOARD: 'timer_keyboard',
} as const;

export const TIMER_DEVICE_NAMES = {
  KEYBOARD: 'Keyboard',
} as const;

export const LEGACY_TIMER_DEVICE_SELECTIONS = {
  KEYBOARD: 'Keyboard',
} as const;

export const TIMER_DEVICE_CAPABILITIES = {
  KEYBOARD: 'keyboard',
} as const;

export const TIMER_DEVICE_CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

export const TIMER_DEVICE_ACTIVATION_STATUS = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  ACTIVE: 'active',
  STOPPING: 'stopping',
  ERROR: 'error',
} as const;

export const TIMER_DEVICE_AVAILABILITY = {
  AVAILABLE: 'available',
  IN_USE: 'in-use',
  UNAVAILABLE: 'unavailable',
} as const;

export const TIMER_DEVICE_MANAGEMENT_MODE = {
  MANAGED: 'managed',
  LEGACY: 'legacy',
} as const;

export const DEVICE_LEASE_REJECTION_REASONS = {
  DEVICE_NOT_FOUND: 'device-not-found',
  ALREADY_IN_USE: 'already-in-use',
  INCOMPATIBLE_DEVICE: 'incompatible-device',
  START_FAILED: 'start-failed',
  STOP_FAILED: 'stop-failed',
  OWNER_NOT_REGISTERED: 'owner-not-registered',
} as const;

export const DEVICE_DISCONNECT_FAILURE_REASONS = {
  DISCONNECT_FAILED: 'disconnect-failed',
} as const;

export type TimerDeviceId = ValueOf<typeof TIMER_DEVICE_IDS>;
export type TimerDeviceType = ValueOf<typeof TIMER_DEVICE_TYPES>;
export type TimerDeviceName = ValueOf<typeof TIMER_DEVICE_NAMES>;
export type TimerDeviceCapability = ValueOf<typeof TIMER_DEVICE_CAPABILITIES>;
export type TimerDeviceConnectionStatus = ValueOf<typeof TIMER_DEVICE_CONNECTION_STATUS>;
export type TimerDeviceActivationStatus = ValueOf<typeof TIMER_DEVICE_ACTIVATION_STATUS>;
export type TimerDeviceAvailability = ValueOf<typeof TIMER_DEVICE_AVAILABILITY>;
export type TimerDeviceManagementMode = ValueOf<typeof TIMER_DEVICE_MANAGEMENT_MODE>;
export type DeviceLeaseRejectionReason = ValueOf<typeof DEVICE_LEASE_REJECTION_REASONS>;
export type DeviceDisconnectFailureReason = ValueOf<typeof DEVICE_DISCONNECT_FAILURE_REASONS>;
