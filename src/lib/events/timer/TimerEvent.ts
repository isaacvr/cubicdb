import type { TimerEventPayloadMap } from './TimerEventPayloadMap';
import type { TimerEventType } from './TimerEventRegistry';

export interface TimerEvent<K extends TimerEventType = TimerEventType> {
  id: string;
  type: K;
  timestamp: number;
  payload: TimerEventPayloadMap[K];
}

export interface TimerEventSubscription {
  unsubscribe(): void;
}
