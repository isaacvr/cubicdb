// Event system entry point - centralized event bus
export { EventBus } from './EventBus';
export { EventDispatcher } from './EventDispatcher';
export type { DomainEvent, EventHandler, EventSubscription } from './types';
export { eventBus } from './singleton';

// Domain events
export * from './domain';
