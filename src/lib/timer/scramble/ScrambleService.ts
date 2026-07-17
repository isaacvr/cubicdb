import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { NormalizedScrambleError } from '$lib/events/timer/ScrambleEventTypes';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { IScrambleGenerator } from './IScrambleGenerator';
import { normalizeScramble } from './normalizeScramble';

export type ScrambleNormalizer = (scramble: string, mode: string) => string;

function normalizeError(error: unknown): NormalizedScrambleError {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

export class ScrambleService {
  private readonly subscription: EventSubscription;
  private destroyed = false;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly generators: IScrambleGenerator[],
    private readonly normalize: ScrambleNormalizer = normalizeScramble,
  ) {
    this.subscription = bus.subscribe(
      TIMER_EVENTS.SCRAMBLE_REQUESTED,
      'scramble-service:generate',
      event => { void this.generate(event); },
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private async generate(event: Extract<TimerEvent, { type: typeof TIMER_EVENTS.SCRAMBLE_REQUESTED }>) {
    const { providedScramble, mode, length, probability } = event.payload;
    const generatorRequest = { mode, length, probability };

    if (providedScramble !== undefined) {
      const scramble = this.normalize(providedScramble, mode);
      if (this.destroyed) return;
      await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
        ...event.payload,
        requestId: event.id,
        scramble,
      }));
      return;
    }

    const errors: Array<{ generatorId: string; error: NormalizedScrambleError }> = [];
    for (const generator of this.generators) {
      if (!generator.supports(mode)) continue;

      try {
        const generated = await generator.generate(generatorRequest);
        if (!generated) throw new Error('Generator returned no scramble');
        const scramble = this.normalize(generated, mode);
        if (this.destroyed) return;
        await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
          ...event.payload,
          requestId: event.id,
          scramble,
        }));
        return;
      } catch (error) {
        errors.push({ generatorId: generator.id, error: normalizeError(error) });
      }
    }

    if (errors.length === 0) {
      errors.push({
        generatorId: 'scramble-service',
        error: {
          name: 'UnsupportedScrambleMode',
          message: `No scramble generator supports mode "${mode}"`,
        },
      });
    }

    if (this.destroyed) return;
    await this.bus.publish(this.events.create(TIMER_EVENTS.SCRAMBLE_GENERATION_FAILED, {
      ...event.payload,
      requestId: event.id,
      errors,
    }));
  }
}
