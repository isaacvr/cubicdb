import type { DomainEvent } from '../types';
import type { Solve } from '@interfaces';

/**
 * Emitted when a solve is added to a session
 */
export class SolveAdded implements DomainEvent {
  readonly type = 'SolveAdded';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(public readonly solve: Solve) {}
}

/**
 * Emitted when a solve is updated
 */
export class SolveUpdated implements DomainEvent {
  readonly type = 'SolveUpdated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly previousSolve: Solve,
    public readonly updatedSolve: Solve
  ) {}
}

/**
 * Emitted when solves are removed
 */
export class SolvesRemoved implements DomainEvent {
  readonly type = 'SolvesRemoved';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(public readonly solves: Solve[]) {}
}

/**
 * Emitted when a solve is selected/focused
 */
export class SolveSelected implements DomainEvent {
  readonly type = 'SolveSelected';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(public readonly solve: Solve | null) {}
}
