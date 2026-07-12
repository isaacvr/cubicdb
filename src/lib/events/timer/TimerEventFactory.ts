import type { TimerEvent } from './TimerEvent';
import type { TimerEventPayloadMap } from './TimerEventPayloadMap';
import type { TimerEventType } from './TimerEventRegistry';

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
    private readonly idProvider: IEventIdProvider,
  ) {}

  create<K extends TimerEventType>(type: K, payload: TimerEventPayloadMap[K]): TimerEvent<K> {
    return this.make(type, payload, this.clock.now());
  }

  fromNative<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    nativeEvent: NativeTimestampSource,
  ): TimerEvent<K> {
    const timestamp = nativeEvent.timeStamp;
    return this.make(type, payload, timestamp);
  }

  private make<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    timestamp: number,
  ): TimerEvent<K> {
    return { id: this.idProvider.next(), type, timestamp, payload };
  }
}
