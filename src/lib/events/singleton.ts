import { EventBus } from './EventBus';
import { EventDispatcher } from './EventDispatcher';

// Global singleton instances
const eventBus = new EventBus();
const eventDispatcher = new EventDispatcher(eventBus);

export { eventBus, eventDispatcher };
