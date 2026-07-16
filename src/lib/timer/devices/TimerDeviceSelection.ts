export interface TimerDeviceSelectionOption {
  readonly id: string;
  readonly type: string;
}

const LEGACY_KEYBOARD_SELECTION = 'Keyboard';
const KEYBOARD_DEVICE_TYPE = 'timer_keyboard';

export function resolveTimerDeviceSelection(
  input: string | undefined,
  devices: readonly TimerDeviceSelectionOption[],
): string | null {
  const exactMatch = devices.find(device => device.id === input);
  if (exactMatch) return exactMatch.id;

  if (input === LEGACY_KEYBOARD_SELECTION) {
    const keyboard = devices.find(device => device.type === KEYBOARD_DEVICE_TYPE);
    if (keyboard) return keyboard.id;
  }

  return devices[0]?.id ?? null;
}
