import type { DomainEvent, IEventDispatcher } from './types';
import { EventBus } from './EventBus';

/**
 * Event dispatcher - wraps event bus to provide dispatch interface
 * Useful for injecting into use cases
 */
export class EventDispatcher implements IEventDispatcher {
  constructor(private eventBus: EventBus) {}

  /**
   * Dispatch a domain event
   * This is what use cases call to emit domain events
   */
  async dispatch<T extends DomainEvent>(event: T): Promise<void> {
    await this.eventBus.emit(event);
  }
}
