import type { TimerEvent } from "./TimerEvent";
import type { TimerEventType } from "./TimerEvent";
import type { TimerEventPayloadMap } from "./TimerEventPayloadMap";
import { TIMER_EVENTS } from "./TimerEventRegistry";
import { EventBus } from "../EventBus";

export interface IMonotonicClock {
  now(): number;
}

export interface IEventIdProvider {
  next(): string;
}

export interface NativeTimestampSource {
  readonly timeStamp: number;
}

export class TimerEventFactory {
  constructor(
    private readonly clock: IMonotonicClock,
    private readonly idProvider: IEventIdProvider
  ) {}

  create<K extends TimerEventType>(type: K, payload: TimerEventPayloadMap[K]): TimerEvent<K> {
    return this.make(type, payload, this.clock.now());
  }

  fromNative<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    nativeEvent: NativeTimestampSource
  ): TimerEvent<K> {
    const timestamp = nativeEvent.timeStamp;
    return this.make(type, payload, timestamp);
  }

  private make<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    timestamp: number
  ): TimerEvent<K> {
    return { id: this.idProvider.next(), type, timestamp, payload } as TimerEvent<K>;
  }
}

export function createApplicationEventBus(eventFactory: TimerEventFactory): EventBus<TimerEvent> {
  return new EventBus((event, handlerId, error) => {
    if (event.type === TIMER_EVENTS.HANDLER_FAILED) return null;
    const normalizedError =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: "Error", message: String(error) };
    return eventFactory.create(TIMER_EVENTS.HANDLER_FAILED, {
      eventId: event.id,
      eventType: event.type,
      eventTimestamp: event.timestamp,
      handlerId,
      error: normalizedError,
    });
  });
}
