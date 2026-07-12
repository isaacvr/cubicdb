export interface TimerReading {
  timestamp: number;
  elapsedMs: number;
}

export type TimerReadingCallback = (reading: TimerReading) => void;

export interface ITimerDevice {
  readonly id: string;
  start(): void;
  stop(): void;
  destroy(): void;
}
