import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';

export interface EventLogSink {
  info(category: string, message: string, data?: unknown): void;
}

export class EventLogger {
  private readonly subscription: EventSubscription;

  constructor(bus: IEventBus<TimerEvent>, logger: EventLogSink) {
    this.subscription = bus.observe(event => {
      const data = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        payload: event.payload,
      };
      logger.info('event', event.type, data);
      for (const category of diagnosticCategories(event)) {
        logger.info(category, event.type, data);
      }
    });
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}

function diagnosticCategories(event: TimerEvent): string[] {
  const categories: string[] = [];

  if (
    event.type.startsWith('generation.')
    || event.type.startsWith('timer.scramble')
    || event.type.startsWith('timer.solve')
  ) {
    categories.push('service');
  }

  if (
    event.type.startsWith('timer.device.')
    || event.type === TIMER_EVENTS.STATISTICS_UPDATED
    || event.type === TIMER_EVENTS.NEW_RECORD
  ) {
    categories.push('reactor');
  }

  if (event.type === TIMER_EVENTS.HANDLER_FAILED) {
    categories.push('handler');
  }

  return categories;
}
