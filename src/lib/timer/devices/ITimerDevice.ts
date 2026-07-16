import type {
  TimerDeviceActivationContext,
  TimerDeviceDescriptor,
} from './TimerDeviceDescriptor';

export interface TimerReading {
  timestamp: number;
  timeMs: number;
  phase: 'inspection' | 'running';
}

export type TimerReadingCallback = (reading: TimerReading) => void;

export type MaybePromise<T> = T | Promise<T>;

export interface ITimerDevice {
  readonly descriptor: Omit<
    TimerDeviceDescriptor,
    'activationStatus' | 'availability' | 'leaseOwnerId' | 'managementMode'
  >;
  start(context: TimerDeviceActivationContext): MaybePromise<void>;
  stop(): MaybePromise<void>;
  disconnect(): MaybePromise<void>;
  destroy(): MaybePromise<void>;
}
