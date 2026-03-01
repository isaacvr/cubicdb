import type { DomainEvent } from '@events/types';

/**
 * Port for event dispatching
 * Injected into use cases to emit domain events
 */
export interface IEventDispatcher {
  dispatch<T extends DomainEvent>(event: T): Promise<void>;
}
