import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMER_MIGRATION_FLAGS,
  createTimerMigrationFlags,
} from './TimerMigrationFlags';

describe('TimerMigrationFlags', () => {
  it('keeps scramble migration disabled by default', () => {
    expect(DEFAULT_TIMER_MIGRATION_FLAGS.scramble).toBe(false);
  });

  it('accepts a scramble override without mutating defaults', () => {
    const flags = createTimerMigrationFlags({ scramble: true });

    expect(flags.scramble).toBe(true);
    expect(DEFAULT_TIMER_MIGRATION_FLAGS.scramble).toBe(false);
  });
});
