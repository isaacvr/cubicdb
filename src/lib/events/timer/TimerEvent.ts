import type { TimerEventPayloadMap } from './TimerEventPayloadMap';
import type { TimerEventType } from './TimerEventRegistry';

export type TimerEvent<K extends TimerEventType = TimerEventType> = K extends TimerEventType ? {
  id: string;
  type: K;
  timestamp: number;
  payload: TimerEventPayloadMap[K];
} : never;
