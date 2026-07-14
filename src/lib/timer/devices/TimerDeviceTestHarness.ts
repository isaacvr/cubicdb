import type { TimerReading } from './ITimerDevice';
import type { ITimerDevice } from './ITimerDevice';
import type { TimerDeviceActivationContext } from './TimerDeviceDescriptor';

export class TimerDeviceTestHarness implements ITimerDevice {
  readonly calls: string[] = [];
  lastContext: TimerDeviceActivationContext | null = null;
  startError: Error | null = null;
  stopError: Error | null = null;
  disconnectError: Error | null = null;

  constructor(
    readonly descriptor: ITimerDevice['descriptor'],
    private readonly timeline?: string[],
  ) {}

  async start(context: TimerDeviceActivationContext): Promise<void> {
    this.record(`start:${context.ownerId}`);
    this.lastContext = context;
    if (this.startError) {
      const error = this.startError;
      this.startError = null;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.record('stop');
    if (this.stopError) {
      const error = this.stopError;
      this.stopError = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.record('disconnect');
    if (this.disconnectError) {
      const error = this.disconnectError;
      this.disconnectError = null;
      throw error;
    }
  }

  async destroy(): Promise<void> {
    this.record('destroy');
  }

  emitReading(reading: TimerReading): void {
    this.lastContext?.onReading(reading);
  }

  private record(call: string): void {
    this.calls.push(call);
    this.timeline?.push(`${this.descriptor.id}:${call}`);
  }
}
