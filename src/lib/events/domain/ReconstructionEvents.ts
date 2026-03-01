import type { DomainEvent } from '../types';
import type { IDBReconstruction } from '@interfaces';

/**
 * Emitted when a reconstruction is added
 */
export class ReconstructionAdded implements DomainEvent {
  readonly type = 'ReconstructionAdded';
  readonly timestamp = Date.now();
  readonly aggregate = 'Reconstruction';

  constructor(public readonly reconstruction: IDBReconstruction) {}
}

/**
 * Emitted when a reconstruction is updated
 */
export class ReconstructionUpdated implements DomainEvent {
  readonly type = 'ReconstructionUpdated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Reconstruction';

  constructor(
    public readonly previousReconstruction: IDBReconstruction,
    public readonly updatedReconstruction: IDBReconstruction
  ) {}
}

/**
 * Emitted when a reconstruction is removed
 */
export class ReconstructionRemoved implements DomainEvent {
  readonly type = 'ReconstructionRemoved';
  readonly timestamp = Date.now();
  readonly aggregate = 'Reconstruction';

  constructor(public readonly reconstruction: IDBReconstruction) {}
}

/**
 * Emitted when multiple reconstructions are removed
 */
export class ReconstructionsRemoved implements DomainEvent {
  readonly type = 'ReconstructionsRemoved';
  readonly timestamp = Date.now();
  readonly aggregate = 'Reconstruction';

  constructor(public readonly reconstructions: IDBReconstruction[]) {}
}
