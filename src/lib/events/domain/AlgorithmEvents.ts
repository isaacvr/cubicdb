import type { DomainEvent } from '../types';
import type { Algorithm } from '@interfaces';

/**
 * Emitted when an algorithm is added
 */
export class AlgorithmAdded implements DomainEvent {
  readonly type = 'AlgorithmAdded';
  readonly timestamp = Date.now();
  readonly aggregate = 'Algorithm';

  constructor(public readonly algorithm: Algorithm) {}
}

/**
 * Emitted when an algorithm is updated
 */
export class AlgorithmUpdated implements DomainEvent {
  readonly type = 'AlgorithmUpdated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Algorithm';

  constructor(
    public readonly previousAlgorithm: Algorithm,
    public readonly updatedAlgorithm: Algorithm
  ) {}
}

/**
 * Emitted when an algorithm is removed
 */
export class AlgorithmRemoved implements DomainEvent {
  readonly type = 'AlgorithmRemoved';
  readonly timestamp = Date.now();
  readonly aggregate = 'Algorithm';

  constructor(public readonly algorithm: Algorithm) {}
}

/**
 * Emitted when multiple algorithms are removed
 */
export class AlgorithmsRemoved implements DomainEvent {
  readonly type = 'AlgorithmsRemoved';
  readonly timestamp = Date.now();
  readonly aggregate = 'Algorithm';

  constructor(public readonly algorithms: Algorithm[]) {}
}
