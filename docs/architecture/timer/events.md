# Timer Events

## Timer Input Events (Device → Timer)

Notifications emitted by devices. These are accomplished facts, not requests.

```ts
// src/lib/events/domain/TimerEvents.ts

import type { DomainEvent } from '../types';
import type { Penalty } from '@interfaces';

/**
 * Device notifies it entered prevention state.
 * Timer reacts: shows PREVENTION state in UI.
 */
export class DeviceEnteredPrevention implements DomainEvent {
  readonly type = 'DeviceEnteredPrevention';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that inspection started.
 * Timer reacts: shows inspection countdown in UI.
 */
export class DeviceStartedInspection implements DomainEvent {
  readonly type = 'DeviceStartedInspection';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that prevention finished.
 * Occurs between PREVENTION and INSPECTION.
 * Timer reacts: prepares the solve (creates lastSolve).
 * Does NOT activate the ready flag. The ready flag is activated separately, just before RUNNING.
 */
export class DeviceReady implements DomainEvent {
  readonly type = 'DeviceReady';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies the user is about to start (green light).
 * Emitted just before RUNNING:
 *   - Without inspection: immediately after READY.
 *   - With inspection: when the user presses space during INSPECTION.
 * Timer reacts: activates flag ready=true.
 */
export class DeviceGreenLight implements DomainEvent {
  readonly type = 'DeviceGreenLight';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that the stopwatch is running.
 * Timer reacts: shows RUNNING state.
 * Actual time is received through a direct channel (onTimeUpdate), not through EventBus.
 */
export class DeviceStartedRunning implements DomainEvent {
  readonly type = 'DeviceStartedRunning';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that the stopwatch stopped.
 * Timer reacts: saves solve, calculates stats, generates scramble.
 *
 * @param time - Final time in milliseconds.
 *   - Keyboard/Virtual: time measured by the device.
 *   - Stackmat/External: time reported by the hardware.
 * @param steps - Partial times for multi-step sessions.
 */
export class DeviceStopped implements DomainEvent {
  readonly type = 'DeviceStopped';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly time: number,
    public readonly steps?: number[],
  ) {}
}

/**
 * Device notifies that the stopwatch was paused.
 * Timer reacts: freezes the UI.
 */
export class DevicePaused implements DomainEvent {
  readonly type = 'DevicePaused';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that the stopwatch was resumed.
 * Timer reacts: resumes the UI.
 */
export class DeviceResumed implements DomainEvent {
  readonly type = 'DeviceResumed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that the solve was cancelled.
 * Timer reacts: reset UI, saves nothing.
 */
export class DeviceCancelled implements DomainEvent {
  readonly type = 'DeviceCancelled';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifies that inspection expired (+2s grace period).
 * Timer reacts: saves solve with DNF.
 *
 * @param fromInspection - Whether the DNF was caused by expired inspection.
 *   When fromInspection=true, the penalty is NOT editable afterwards.
 */
export class DeviceDNF implements DomainEvent {
  readonly type = 'DeviceDNF';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly fromInspection: boolean,
  ) {}
}

/**
 * Device notifies that a penalty was applied.
 * Timer reacts: marks the penalty on the current solve.
 *
 * Example: inspection passes 15s → P2.
 */
export class DevicePenaltyApplied implements DomainEvent {
  readonly type = 'DevicePenaltyApplied';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly penalty: Penalty,
  ) {}
}

/**
 * Device notifies that an intermediate step was completed (multi-step).
 * Timer reacts: records the step.
 */
export class DeviceStepCompleted implements DomainEvent {
  readonly type = 'DeviceStepCompleted';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly stepTime: number,
    public readonly stepNumber: number,
  ) {}
}

/**
 * A new scramble is requested.
 * Can come from a device (stackmat reset), from the UI, or from the Timer itself (post-stop).
 */
export class ScrambleRequested implements DomainEvent {
  readonly type = 'ScrambleRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly source: string) {}
}
```

## Timer Output Events (Timer → UI/System)

Events emitted by the Timer after processing. The UI and other systems consume them.

```ts
/**
 * Timer changed its visual state.
 * UI reacts: updates what is displayed.
 */
export class TimerStateChanged implements DomainEvent {
  readonly type = 'TimerStateChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly previousState: TimerState,
    public readonly newState: TimerState,
  ) {}
}

/**
 * A new scramble was generated.
 * UI reacts: displays the new scramble and image.
 */
export class ScrambleGenerated implements DomainEvent {
  readonly type = 'ScrambleGenerated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly scramble: string) {}
}

/**
 * A new record was reached.
 * UI reacts: confetti, notification.
 */
export class NewRecord implements DomainEvent {
  readonly type = 'NewRecord';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly records: Array<{
      name: string;
      previous: number;
      current: number;
    }>,
  ) {}
}

/**
 * A celebration should be displayed.
 */
export class CelebrationTriggered implements DomainEvent {
  readonly type = 'CelebrationTriggered';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly records: Array<{
      name: string;
      previous: number;
      current: number;
    }>,
  ) {}
}

// SolveAdded, SolveUpdated, SolvesRemoved are already defined in SolveEvents.ts
```

## Time Channel (High Frequency)

The stopwatch time and inspection countdown do NOT go through the EventBus.
A direct callback is used, which the Timer provides to the device at binding time.

```ts
/**
 * High-frequency channel for time updates.
 * The device calls this callback ~100 times/second.
 * The Timer connects it internally to the UI's reactive store.
 */
type TimeUpdateCallback = (time: number) => void;
```

## Session Events

```ts
/**
 * A new session was selected.
 * Timer reacts: loads solves, recalculates stats, adjusts scramble, changes device if needed.
 */
export class SessionSwitched implements DomainEvent {
  readonly type = 'SessionSwitched';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(
    public readonly previousSession: Session | null,
    public readonly newSession: Session,
  ) {}
}

/**
 * Settings of the active session were changed.
 * Timer reacts: propagates to device if needed (e.g., inspection on/off).
 */
export class ActiveSessionSettingsChanged implements DomainEvent {
  readonly type = 'ActiveSessionSettingsChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(
    public readonly session: Session,
    public readonly changedKeys: string[],
  ) {}
}
```

## Solve Events

```ts
// Already defined in SolveEvents.ts, reused:
// - SolveAdded (post-timer, already covered)
// - SolveUpdated (penalty/comments editing)
// - SolvesRemoved (deletion)

/**
 * A request to change a solve's penalty.
 * Timer validates editing rules before applying.
 */
export class SolvePenaltyChangeRequested implements DomainEvent {
  readonly type = 'SolvePenaltyChangeRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solve: Solve,
    public readonly newPenalty: Penalty,
  ) {}
}

/**
 * A request to delete solves.
 * Requires user confirmation before processing.
 */
export class SolveRemovalRequested implements DomainEvent {
  readonly type = 'SolveRemovalRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solves: Solve[],
  ) {}
}

/**
 * Solve deletion was confirmed.
 * Timer processes: deletes from DB, recalculates stats.
 */
export class SolveRemovalConfirmed implements DomainEvent {
  readonly type = 'SolveRemovalConfirmed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solves: Solve[],
  ) {}
}
```
