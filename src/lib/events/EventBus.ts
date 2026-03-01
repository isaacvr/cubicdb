import type { DomainEvent, EventHandler, EventSubscription, IEventBus } from './types';

interface Subscription<T extends DomainEvent> {
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
}

/**
 * Centralized event bus for domain events
 * Provides type-safe pub/sub with priority handling
 */
export class EventBus implements IEventBus {
  private subscriptions: Map<string, Subscription<any>[]> = new Map();
  private inProgress: Map<string, boolean> = new Map();

  /**
   * Subscribe to a domain event
   * @param eventType Constructor of the event type
   * @param handler Function to call when event is emitted
   * @param options Priority (higher = executed first) and once flag
   * @returns Subscription handle to unsubscribe
   */
  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>,
    options: { priority?: number; once?: boolean } = {}
  ): EventSubscription {
    const eventName = eventType.name;
    const priority = options.priority ?? 0;
    const once = options.once ?? false;

    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, []);
    }

    const subscription: Subscription<T> = { handler, priority, once };
    const handlers = this.subscriptions.get(eventName)!;
    
    // Insert in priority order (higher priority first)
    const insertIndex = handlers.findIndex(h => h.priority < priority);
    if (insertIndex === -1) {
      handlers.push(subscription);
    } else {
      handlers.splice(insertIndex, 0, subscription);
    }

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        const idx = handlers.indexOf(subscription);
        if (idx > -1) {
          handlers.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Emit a domain event to all subscribers
   * @param event The event to emit
   */
  async emit<T extends DomainEvent>(event: T): Promise<void> {
    const eventName = event.constructor.name;
    const handlers = this.subscriptions.get(eventName);

    if (!handlers || handlers.length === 0) {
      return;
    }

    // Prevent infinite loops
    if (this.inProgress.get(eventName)) {
      console.warn(`Event "${eventName}" is already being processed`);
      return;
    }

    this.inProgress.set(eventName, true);

    try {
      // Process handlers in order, awaiting each one
      for (const subscription of handlers) {
        try {
          await subscription.handler(event);
          
          if (subscription.once) {
            const idx = handlers.indexOf(subscription);
            if (idx > -1) {
              handlers.splice(idx, 1);
            }
          }
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      }
    } finally {
      this.inProgress.delete(eventName);
    }
  }

  /**
   * Get number of subscribers for an event type (useful for debugging)
   */
  getSubscriberCount(eventType: new (...args: any[]) => DomainEvent): number {
    const eventName = eventType.name;
    return this.subscriptions.get(eventName)?.length ?? 0;
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  clear(): void {
    this.subscriptions.clear();
    this.inProgress.clear();
  }
}
