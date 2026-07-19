import type { EventSubscription, IEventBus } from "$lib/events/EventBus";
import type { TimerEvent, TimerEventType } from "$lib/events/timer/TimerEvent";
import type { NativeTimestampSource, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { TimerEventPayloadMap } from "$lib/events/timer/TimerEventPayloadMap";
import { GENERATION_EVENTS } from "./GenerationEventRegistry";
import type {
  GenerationFailurePayload,
  ImageGenerationConfig,
  ImageGenerationResult,
  ScrambleGenerationConfig,
  ScrambleGenerationResult,
} from "./GenerationEventTypes";

export interface GenerationRequestOptions {
  sourceEvent?: NativeTimestampSource;
}

type Detach = () => void;
type Handler<T> = (payload: T) => void;

export interface GenerationClient {
  readonly scopeId: string;
  readonly scrambles: {
    request(config: ScrambleGenerationConfig, options?: GenerationRequestOptions): Promise<string>;
    onGenerated(handler: Handler<ScrambleGenerationResult>): Detach;
    onGenerated(requestId: string, handler: Handler<ScrambleGenerationResult>): Detach;
    onFailed(handler: Handler<GenerationFailurePayload>): Detach;
    onFailed(requestId: string, handler: Handler<GenerationFailurePayload>): Detach;
  };
  readonly images: {
    request(config: ImageGenerationConfig, options?: GenerationRequestOptions): Promise<string>;
    onGenerated(handler: Handler<ImageGenerationResult>): Detach;
    onGenerated(requestId: string, handler: Handler<ImageGenerationResult>): Detach;
    onFailed(handler: Handler<GenerationFailurePayload>): Detach;
    onFailed(requestId: string, handler: Handler<GenerationFailurePayload>): Detach;
  };
  destroy(): void;
}

type ScopedResultPayload = { scopeId: string; requestId: string };

export function createGenerationClient(
  bus: IEventBus<TimerEvent>,
  events: TimerEventFactory,
  scopeId: string
): GenerationClient {
  const subscriptions: EventSubscription[] = [];
  let subscriptionSequence = 0;

  function track(subscription: EventSubscription): Detach {
    subscriptions.push(subscription);
    return () => subscription.unsubscribe();
  }

  async function publish<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    options?: GenerationRequestOptions
  ): Promise<string> {
    const event = options?.sourceEvent
      ? events.fromNative(type, payload, options.sourceEvent)
      : events.create(type, payload);
    await bus.publish(event);
    return event.id;
  }

  function subscribe<TPayload extends ScopedResultPayload>(
    type: TimerEventType,
    label: string,
    maybeRequestIdOrHandler: string | Handler<TPayload>,
    maybeHandler?: Handler<TPayload>
  ): Detach {
    const requestId = typeof maybeRequestIdOrHandler === "string" ? maybeRequestIdOrHandler : null;
    const handler = (
      typeof maybeRequestIdOrHandler === "string" ? maybeHandler : maybeRequestIdOrHandler
    ) as Handler<TPayload>;

    return track(
      bus.subscribe(
        type,
        `${scopeId}:generation-client:${label}:${++subscriptionSequence}`,
        event => {
          const payload = event.payload as TPayload;
          if (payload.scopeId !== scopeId) return;
          if (requestId !== null && payload.requestId !== requestId) return;
          handler(payload);
        }
      )
    );
  }

  return {
    scopeId,
    scrambles: {
      request(config, options) {
        return publish(GENERATION_EVENTS.SCRAMBLE_REQUESTED, { scopeId, config }, options);
      },
      onGenerated(
        requestIdOrHandler: string | Handler<ScrambleGenerationResult>,
        maybeHandler?: Handler<ScrambleGenerationResult>
      ) {
        return subscribe<ScrambleGenerationResult>(
          GENERATION_EVENTS.SCRAMBLE_GENERATED,
          "scramble-generated",
          requestIdOrHandler,
          maybeHandler
        );
      },
      onFailed(
        requestIdOrHandler: string | Handler<GenerationFailurePayload>,
        maybeHandler?: Handler<GenerationFailurePayload>
      ) {
        return subscribe<GenerationFailurePayload>(
          GENERATION_EVENTS.SCRAMBLE_FAILED,
          "scramble-failed",
          requestIdOrHandler,
          maybeHandler
        );
      },
    },
    images: {
      request(config, options) {
        return publish(GENERATION_EVENTS.IMAGE_REQUESTED, { scopeId, config }, options);
      },
      onGenerated(
        requestIdOrHandler: string | Handler<ImageGenerationResult>,
        maybeHandler?: Handler<ImageGenerationResult>
      ) {
        return subscribe<ImageGenerationResult>(
          GENERATION_EVENTS.IMAGE_GENERATED,
          "image-generated",
          requestIdOrHandler,
          maybeHandler
        );
      },
      onFailed(
        requestIdOrHandler: string | Handler<GenerationFailurePayload>,
        maybeHandler?: Handler<GenerationFailurePayload>
      ) {
        return subscribe<GenerationFailurePayload>(
          GENERATION_EVENTS.IMAGE_FAILED,
          "image-failed",
          requestIdOrHandler,
          maybeHandler
        );
      },
    },
    destroy() {
      for (const subscription of subscriptions.splice(0)) subscription.unsubscribe();
    },
  };
}
