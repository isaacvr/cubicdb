import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import {
  SCRAMBLE_PREVIEW_CLEAR_REASONS,
  type NormalizedScrambleError,
} from '$lib/events/timer/ScrambleEventTypes';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { IScramblePreviewGenerator } from './IScramblePreviewGenerator';

export const SCRAMBLE_PREVIEW_MAX_ATTEMPTS = 3;

function normalizeError(error: unknown): NormalizedScrambleError {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

export class ScramblePreviewService {
  private readonly subscription: EventSubscription;
  private destroyed = false;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly generator: IScramblePreviewGenerator,
  ) {
    this.subscription = bus.subscribe(
      TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED,
      'scramble-preview-service:generate',
      event => { void this.generate(event); },
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private async generate(
    event: Extract<TimerEvent, { type: typeof TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED }>,
  ): Promise<void> {
    const { ownerId, scrambleRequestId, scramble, mode } = event.payload;
    if (!this.generator.supports(mode)) {
      if (this.destroyed) return;
      await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_CLEARED, {
        ownerId,
        scrambleRequestId,
        reason: SCRAMBLE_PREVIEW_CLEAR_REASONS.UNSUPPORTED_MODE,
      }));
      return;
    }

    let lastError: NormalizedScrambleError = {
      name: 'Error',
      message: 'Preview generation failed',
    };
    for (let attempt = 1; attempt <= SCRAMBLE_PREVIEW_MAX_ATTEMPTS; attempt += 1) {
      try {
        const images = await this.generator.generate(scramble, mode);
        if (this.destroyed) return;
        await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED, {
          ownerId,
          scrambleRequestId,
          requestId: event.id,
          images,
          attemptsUsed: attempt,
        }));
        return;
      } catch (error) {
        lastError = normalizeError(error);
      }
    }

    if (this.destroyed) return;
    await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATION_FAILED, {
      ownerId,
      scrambleRequestId,
      requestId: event.id,
      attemptsUsed: SCRAMBLE_PREVIEW_MAX_ATTEMPTS,
      error: lastError,
    }));
    if (this.destroyed) return;
    await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_CLEARED, {
      ownerId,
      scrambleRequestId,
      reason: SCRAMBLE_PREVIEW_CLEAR_REASONS.GENERATION_FAILED,
    }));
  }
}
