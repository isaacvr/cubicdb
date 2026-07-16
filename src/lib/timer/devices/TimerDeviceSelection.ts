import {
  LEGACY_TIMER_DEVICE_SELECTIONS,
  TIMER_DEVICE_TYPES,
} from './TimerDeviceConstants';

export interface TimerDeviceSelectionOption {
  readonly id: string;
  readonly type: string;
}

export function resolveTimerDeviceSelection(
  input: string | undefined,
  devices: readonly TimerDeviceSelectionOption[],
): string | null {
  const exactMatch = devices.find(device => device.id === input);
  if (exactMatch) return exactMatch.id;

  if (input === LEGACY_TIMER_DEVICE_SELECTIONS.KEYBOARD) {
    const keyboard = devices.find(device => device.type === TIMER_DEVICE_TYPES.KEYBOARD);
    if (keyboard) return keyboard.id;
  }

  return devices[0]?.id ?? null;
}
