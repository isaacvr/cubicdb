import type { TimerEvent, TimerEventSubscription } from './TimerEvent';
import { TimerEventFactory } from './TimerEventFactory';
import type { TimerEventPayloadMap } from './TimerEventPayloadMap';
import { TIMER_EVENTS, type TimerEventType } from './TimerEventRegistry';

type TimerEventHandler<K extends TimerEventType> = (
  event: TimerEvent<K>,
) => void | Promise<void>;
export type TimerEventObserver = (event: TimerEvent) => void;

interface HandlerRegistration<K extends TimerEventType = TimerEventType> {
  id: string;
  handler: TimerEventHandler<K>;
  priority: number;
  once: boolean;
}

export interface ITimerEventBus {
  publish<K extends TimerEventType>(event: TimerEvent<K>): Promise<void>;
  subscribe<K extends TimerEventType>(
    type: K,
    handlerId: string,
    handler: TimerEventHandler<K>,
    options?: { priority?: number; once?: boolean },
  ): TimerEventSubscription;
  observe(observer: TimerEventObserver): TimerEventSubscription;
}

export class TimerEventBus implements ITimerEventBus {
  private readonly handlers = new Map<TimerEventType, HandlerRegistration[]>();
  private readonly queue: TimerEvent[] = [];
  private readonly observers = new Set<TimerEventObserver>();
  private processing = false;
  private insideHandler = false;
  private drainPromise: Promise<void> = Promise.resolve();

  constructor(private readonly eventFactory: TimerEventFactory) {}

  publish<K extends TimerEventType>(event: TimerEvent<K>): Promise<void> {
    this.queue.push(event as TimerEvent);

    if (this.processing) {
      return this.insideHandler ? Promise.resolve() : this.drainPromise;
    }

    this.processing = true;
    this.drainPromise = this.drain();
    return this.drainPromise;
  }

  subscribe<K extends TimerEventType>(
    type: K,
    handlerId: string,
    handler: TimerEventHandler<K>,
    options: { priority?: number; once?: boolean } = {},
  ): TimerEventSubscription {
    const registration: HandlerRegistration<K> = {
      id: handlerId,
      handler,
      priority: options.priority ?? 0,
      once: options.once ?? false,
    };
    const registrations = this.handlers.get(type) ?? [];
    registrations.push(registration as HandlerRegistration);
    registrations.sort((left, right) => right.priority - left.priority);
    this.handlers.set(type, registrations);

    return {
      unsubscribe: () => {
        const index = registrations.indexOf(registration as HandlerRegistration);
        if (index >= 0) registrations.splice(index, 1);
      },
    };
  }

  observe(observer: TimerEventObserver): TimerEventSubscription {
    this.observers.add(observer);
    return { unsubscribe: () => this.observers.delete(observer) };
  }

  private async drain(): Promise<void> {
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        if (event) await this.deliver(event);
      }
    } finally {
      this.processing = false;
      this.insideHandler = false;
    }
  }

  private async deliver(event: TimerEvent): Promise<void> {
    for (const observer of this.observers) {
      try {
        observer(event);
      } catch {
        // Diagnostics must never affect domain-event delivery.
      }
    }

    const registrations = [...(this.handlers.get(event.type) ?? [])];

    for (const registration of registrations) {
      if (!(this.handlers.get(event.type) ?? []).includes(registration)) continue;

      try {
        this.insideHandler = true;
        await registration.handler(event);
      } catch (error) {
        this.enqueueHandlerFailure(event, registration.id, error);
      } finally {
        this.insideHandler = false;
      }

      if (registration.once) {
        const active = this.handlers.get(event.type) ?? [];
        const index = active.indexOf(registration);
        if (index >= 0) active.splice(index, 1);
      }
    }
  }

  private enqueueHandlerFailure(event: TimerEvent, handlerId: string, error: unknown): void {
    if (event.type === TIMER_EVENTS.HANDLER_FAILED) return;

    const normalizedError = error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: 'Error', message: String(error) };
    const payload: TimerEventPayloadMap[typeof TIMER_EVENTS.HANDLER_FAILED] = {
      eventId: event.id,
      eventType: event.type,
      eventTimestamp: event.timestamp,
      handlerId,
      error: normalizedError,
    };
    this.queue.push(this.eventFactory.create(TIMER_EVENTS.HANDLER_FAILED, payload));
  }
}
