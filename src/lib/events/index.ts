// Event system entry point - centralized event bus
export { TIMER_EVENTS, type TimerEventType } from "./timer/TimerEventRegistry";
export type { TimerEventPayloadMap } from "./timer/TimerEventPayloadMap";
export type { TimerEvent } from "./timer/TimerEvent";
export {
  TimerEventFactory,
  createApplicationEventBus,
  type IEventIdProvider,
  type IMonotonicClock,
  type NativeTimestampSource,
} from "./timer/TimerEventFactory";
export { EventBus, type IEventBus } from "./EventBus";
export type {
  DeviceLeaseRejectionReason,
  LegacyTimerDeviceDescriptor,
  TimerDeviceDescriptor,
} from "$lib/timer/devices/TimerDeviceDescriptor";
export { EventDispatcher } from "./EventDispatcher";
export type { DomainEvent, EventHandler, EventSubscription } from "./types";
export { eventBus } from "./singleton";

// Domain events
export * from "./domain";
export * from "./emitters";
export * from "./modules";
