// Base types for the event system
export interface DomainEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly aggregate?: string;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

export interface IEventBus {
  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>,
    options?: { priority?: number; once?: boolean }
  ): EventSubscription;

  emit<T extends DomainEvent>(event: T): Promise<void>;
}

export interface IEventDispatcher {
  dispatch<T extends DomainEvent>(event: T): Promise<void>;
}
