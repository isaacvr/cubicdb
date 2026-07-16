import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';

export interface EventLogSink {
  info(category: string, message: string, data?: unknown): void;
}

export class EventLogger {
  private readonly subscription: EventSubscription;

  constructor(bus: IEventBus<TimerEvent>, logger: EventLogSink) {
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
