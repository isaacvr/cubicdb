import { describe, expect, it } from 'vitest';
import {
  DEVICE_DISCONNECT_FAILURE_REASONS,
  DEVICE_LEASE_REJECTION_REASONS,
  LEGACY_TIMER_DEVICE_SELECTIONS,
  TIMER_DEVICE_ACTIVATION_STATUS,
  TIMER_DEVICE_AVAILABILITY,
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_MANAGEMENT_MODE,
  TIMER_DEVICE_NAMES,
  TIMER_DEVICE_TYPES,
} from './TimerDeviceConstants';

const registries = [
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_NAMES,
  TIMER_DEVICE_TYPES,
  LEGACY_TIMER_DEVICE_SELECTIONS,
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_ACTIVATION_STATUS,
  TIMER_DEVICE_AVAILABILITY,
  TIMER_DEVICE_MANAGEMENT_MODE,
  DEVICE_LEASE_REJECTION_REASONS,
  DEVICE_DISCONNECT_FAILURE_REASONS,
];

describe('timer device constants', () => {
  it('keeps every public registry non-empty and internally unique', () => {
    for (const registry of registries) {
      const values = Object.values(registry);
      expect(values.length).toBeGreaterThan(0);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
