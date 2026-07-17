import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS, type GenerationError } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IImageGenerator } from './IImageGenerator';

export const IMAGE_GENERATION_MAX_ATTEMPTS = 3;

function normalizeError(error: unknown): GenerationError {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

export class ImageGenerationService {
  private readonly subscription: EventSubscription;
  private destroyed = false;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly generator: IImageGenerator,
  ) {
    this.subscription = bus.subscribe(
      GENERATION_EVENTS.IMAGE_REQUESTED,
      'image-generation-service:generate',
      event => { void this.generate(event); },
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private async generate(
    event: Extract<TimerEvent, { type: typeof GENERATION_EVENTS.IMAGE_REQUESTED }>,
  ): Promise<void> {
    const { scopeId, config } = event.payload;

    if (!this.generator.supports(config)) {
      await this.publishFailure(scopeId, event.id, {
        name: 'UnsupportedImageGenerationConfig',
        message: `Image generator does not support mode "${config.mode}" and view "${config.view}"`,
      });
      return;
    }

    let lastError: GenerationError = { name: 'Error', message: 'Image generation failed' };
    for (let attempt = 1; attempt <= IMAGE_GENERATION_MAX_ATTEMPTS; attempt += 1) {
      try {
        const images = await this.generator.generate(config);
        if (this.destroyed) return;
        await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_GENERATED, {
          scopeId,
          requestId: event.id,
          images,
        }));
        return;
      } catch (error) {
        lastError = normalizeError(error);
        if (this.destroyed) return;
        if (attempt < IMAGE_GENERATION_MAX_ATTEMPTS) {
          await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_RETRYING, {
            scopeId,
            requestId: event.id,
            attempt,
            error: lastError,
          }));
        }
      }
    }

    await this.publishFailure(scopeId, event.id, lastError);
  }

  private async publishFailure(
    scopeId: string,
    requestId: string,
    error: GenerationError,
  ): Promise<void> {
    if (this.destroyed) return;
    await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_FAILED, {
      scopeId,
      requestId,
      errors: [error],
    }));
  }
}
