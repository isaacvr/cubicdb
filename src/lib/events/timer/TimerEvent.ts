import type { TimerEventPayloadMap } from "./TimerEventPayloadMap";

export type TimerEventType = keyof TimerEventPayloadMap;

export type TimerEvent<K extends TimerEventType = TimerEventType> = K extends TimerEventType
  ? {
      id: string;
      type: K;
      timestamp: number;
      payload: TimerEventPayloadMap[K];
    }
  : never;
