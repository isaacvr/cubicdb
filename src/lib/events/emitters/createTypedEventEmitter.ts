import type { IEventBus } from "$lib/events/EventBus";
import type { TimerEvent, TimerEventType } from "$lib/events/timer/TimerEvent";
import type { NativeTimestampSource, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { TimerEventPayloadMap } from "$lib/events/timer/TimerEventPayloadMap";

export interface TypedEventEmitterDependencies {
  bus: IEventBus<TimerEvent>;
  events: TimerEventFactory;
}

export interface EmitEventOptions {
  sourceEvent?: NativeTimestampSource;
}

export type EmitTypedEvent = <K extends TimerEventType>(
  type: K,
  payload: TimerEventPayloadMap[K],
  options?: EmitEventOptions
) => Promise<string>;

export function createTypedEventEmitter({
  bus,
  events,
}: TypedEventEmitterDependencies): EmitTypedEvent {
  return async function emit<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    options?: EmitEventOptions
  ): Promise<string> {
    const event = options?.sourceEvent
      ? events.fromNative(type, payload, options.sourceEvent)
      : events.create(type, payload);
    await bus.publish(event);
    return event.id;
  };
}
