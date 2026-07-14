// Event system entry point - centralized event bus
export { EventBus } from './EventBus';
export { TIMER_EVENTS, type TimerEventType } from './timer/TimerEventRegistry';
export type { TimerEventPayloadMap } from './timer/TimerEventPayloadMap';
export type { TimerEvent, TimerEventSubscription } from './timer/TimerEvent';
export {
  TimerEventFactory,
  type IEventIdProvider,
  type IMonotonicClock,
  type NativeTimestampSource,
} from './timer/TimerEventFactory';
export { TimerEventBus, type ITimerEventBus } from './timer/TimerEventBus';
export type {
  DeviceLeaseRejectionReason,
  LegacyTimerDeviceDescriptor,
  TimerDeviceDescriptor,
} from '$lib/timer/devices/TimerDeviceDescriptor';
export { EventDispatcher } from './EventDispatcher';
export type { DomainEvent, EventHandler, EventSubscription } from './types';
export { eventBus } from './singleton';

// Domain events
export * from './domain';
