import type { ITimerEventBus } from '$lib/events/timer/TimerEventBus';
import type { TimerEventSubscription } from '$lib/events/timer/TimerEvent';

export interface TimerEventLogSink {
  info(category: string, message: string, data?: unknown): void;
}

export class TimerEventLogger {
  private readonly subscription: TimerEventSubscription;

  constructor(bus: ITimerEventBus, logger: TimerEventLogSink) {
    this.subscription = bus.observe(event => {
      logger.info('event', event.type, {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        payload: event.payload,
      });
    });
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}
