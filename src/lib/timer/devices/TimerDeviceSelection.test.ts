import { describe, expect, it } from 'vitest';
import { TIMER_DEVICE_IDS, TIMER_DEVICE_TYPES } from './TimerDeviceDescriptor';
import { resolveTimerDeviceSelection } from './TimerDeviceSelection';

const devices = [
  { id: TIMER_DEVICE_IDS.KEYBOARD, type: TIMER_DEVICE_TYPES.KEYBOARD },
  { id: 'cubicdb:device:manual', type: 'manual_entry' },
];

describe('resolveTimerDeviceSelection', () => {
  it('keeps an exact canonical selection', () => {
    expect(resolveTimerDeviceSelection(TIMER_DEVICE_IDS.KEYBOARD, devices))
      .toBe(TIMER_DEVICE_IDS.KEYBOARD);
  });

  it('maps the legacy Keyboard label to the canonical keyboard ID', () => {
    expect(resolveTimerDeviceSelection('Keyboard', devices))
      .toBe(TIMER_DEVICE_IDS.KEYBOARD);
  });

  it('falls back to the first available device for missing or stale selections', () => {
    expect(resolveTimerDeviceSelection(undefined, devices)).toBe(TIMER_DEVICE_IDS.KEYBOARD);
    expect(resolveTimerDeviceSelection('missing-device', devices)).toBe(TIMER_DEVICE_IDS.KEYBOARD);
    expect(resolveTimerDeviceSelection(undefined, [])).toBeNull();
  });
});
