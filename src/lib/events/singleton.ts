import { EventBus } from './EventBus';
import { EventDispatcher } from './EventDispatcher';
import type { DomainEvent } from './types';

// Global singleton instances
const eventBus = new EventBus<DomainEvent>();
const eventDispatcher = new EventDispatcher(eventBus);

export { eventBus, eventDispatcher };
