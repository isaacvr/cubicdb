export interface TimerMigrationFlags {
  keyboard: boolean;
  scramble: boolean;
  manual: boolean;
  virtual: boolean;
  stackmat: boolean;
  qiyi: boolean;
  gan: boolean;
}

export const DEFAULT_TIMER_MIGRATION_FLAGS: Readonly<TimerMigrationFlags> = Object.freeze({
  keyboard: false,
  scramble: false,
  manual: false,
  virtual: false,
  stackmat: false,
  qiyi: false,
  gan: false,
});

export function createTimerMigrationFlags(
  overrides: Partial<TimerMigrationFlags> = {},
): TimerMigrationFlags {
  return { ...DEFAULT_TIMER_MIGRATION_FLAGS, ...overrides };
}
