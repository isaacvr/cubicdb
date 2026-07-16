export interface EventEnvelope {
  readonly type: string;
  readonly timestamp: number;
}

export interface EventSubscription {
  unsubscribe(): void;
}

type EventType<TEvent extends EventEnvelope> = TEvent['type'];
type EventForType<TEvent extends EventEnvelope, K extends EventType<TEvent>> =
  TEvent extends { type: K } ? TEvent : never;
type EventHandler<TEvent extends EventEnvelope> = (event: TEvent) => void | Promise<void>;
type EventObserver<TEvent extends EventEnvelope> = (event: TEvent) => void;

interface HandlerRegistration<TEvent extends EventEnvelope> {
  id: string;
  handler: EventHandler<TEvent>;
  priority: number;
  once: boolean;
}

export type HandlerFailureFactory<TEvent extends EventEnvelope> = (
  event: TEvent,
  handlerId: string,
  error: unknown,
) => TEvent | null;

export interface IEventBus<TEvent extends EventEnvelope> {
  publish(event: TEvent): Promise<void>;
  subscribe<K extends EventType<TEvent>>(
    type: K,
    handlerId: string,
    handler: EventHandler<EventForType<TEvent, K>>,
    options?: { priority?: number; once?: boolean },
  ): EventSubscription;
  observe(observer: EventObserver<TEvent>): EventSubscription;
}

/**
 * Application event bus with deterministic queued delivery.
 *
 * The constructor-based subscribe/emit overloads are a temporary compatibility
 * boundary for the previous, unused domain-event API. New code must publish
 * typed event envelopes and subscribe by event type.
 */
export class EventBus<TEvent extends EventEnvelope> implements IEventBus<TEvent> {
  private readonly handlers = new Map<string, HandlerRegistration<TEvent>[]>();
  private readonly queue: TEvent[] = [];
  private readonly observers = new Set<EventObserver<TEvent>>();
  private processing = false;
  private insideHandler = false;
  private drainPromise: Promise<void> = Promise.resolve();
  private legacyHandlerSequence = 0;

  constructor(private readonly createHandlerFailure?: HandlerFailureFactory<TEvent>) {}

  publish(event: TEvent): Promise<void> {
    this.queue.push(event);

    if (this.processing) {
      return this.insideHandler ? Promise.resolve() : this.drainPromise;
    }

    this.processing = true;
    this.drainPromise = this.drain();
    return this.drainPromise;
  }

  /** @deprecated Publish typed event envelopes with publish(). */
  emit(event: TEvent): Promise<void> {
    return this.publish(event);
  }

  subscribe<K extends EventType<TEvent>>(
    type: K,
    handlerId: string,
    handler: EventHandler<EventForType<TEvent, K>>,
    options?: { priority?: number; once?: boolean },
  ): EventSubscription;
  /** @deprecated Subscribe by the event type string. */
  subscribe<TLegacyEvent extends TEvent>(
    eventType: new (...args: any[]) => TLegacyEvent,
    handler: EventHandler<TLegacyEvent>,
    options?: { priority?: number; once?: boolean },
  ): EventSubscription;
  subscribe(
    typeOrConstructor: string | (new (...args: any[]) => any),
    handlerIdOrHandler: string | EventHandler<any>,
    handlerOrOptions?: EventHandler<any> | { priority?: number; once?: boolean },
    explicitOptions: { priority?: number; once?: boolean } = {},
  ): EventSubscription {
    const legacy = typeof typeOrConstructor !== 'string';
    const type = legacy ? typeOrConstructor.name : typeOrConstructor;
    const handlerId = legacy
      ? `${type}:legacy:${++this.legacyHandlerSequence}`
      : handlerIdOrHandler as string;
    const handler = (legacy ? handlerIdOrHandler : handlerOrOptions) as EventHandler<TEvent>;
    const options = (legacy ? handlerOrOptions : explicitOptions) as {
      priority?: number;
      once?: boolean;
    } | undefined;
    const registration: HandlerRegistration<TEvent> = {
      id: handlerId,
      handler,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };
    const registrations = this.handlers.get(type) ?? [];
    registrations.push(registration);
    registrations.sort((left, right) => right.priority - left.priority);
    this.handlers.set(type, registrations);

    return {
      unsubscribe: () => {
        const index = registrations.indexOf(registration);
        if (index >= 0) registrations.splice(index, 1);
      },
    };
  }

  observe(observer: EventObserver<TEvent>): EventSubscription {
    this.observers.add(observer);
    return { unsubscribe: () => this.observers.delete(observer) };
  }

  getSubscriberCount(typeOrConstructor: string | (new (...args: any[]) => TEvent)): number {
    const type = typeof typeOrConstructor === 'string'
      ? typeOrConstructor
      : typeOrConstructor.name;
    return this.handlers.get(type)?.length ?? 0;
  }

  clear(): void {
    this.handlers.clear();
    this.observers.clear();
    this.queue.length = 0;
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

  private async deliver(event: TEvent): Promise<void> {
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
        const failure = this.createHandlerFailure?.(event, registration.id, error);
        if (failure) this.queue.push(failure);
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
}
