import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS, type GenerationError } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IScrambleGenerator } from './IScrambleGenerator';
import { normalizeScramble } from './normalizeScramble';

export type ScrambleNormalizer = (scramble: string, mode: string) => string;

function normalizeError(error: unknown, source: string): GenerationError {
  if (error instanceof Error) return { name: error.name, message: error.message, source };
  return { name: 'Error', message: String(error), source };
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
      GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      'scramble-service:generate',
      event => { void this.generate(event); },
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private async generate(
    event: Extract<TimerEvent, { type: typeof GENERATION_EVENTS.SCRAMBLE_REQUESTED }>,
  ) {
    const { scopeId, config } = event.payload;
    const { providedScramble, mode } = config;
    const count = config.count ?? 1;
    const length = config.length ?? 0;
    const probability = config.probability ?? -1;
    const generatorRequest = { mode, length, probability };

    if (providedScramble !== undefined) {
      const scramble = this.normalize(providedScramble, mode);
      if (this.destroyed) return;
      await this.bus.publish(this.events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
        scopeId,
        requestId: event.id,
        scrambles: [scramble],
      }));
      return;
    }

    const errors: GenerationError[] = [];
    for (const generator of this.generators) {
      if (!generator.supports(mode)) continue;

      try {
        const scrambles: string[] = [];
        for (let index = 0; index < count; index += 1) {
          const generated = await generator.generate(generatorRequest);
          if (!generated) throw new Error('Generator returned no scramble');
          scrambles.push(this.normalize(generated, mode));
        }
        if (this.destroyed) return;
        await this.bus.publish(this.events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
          scopeId,
          requestId: event.id,
          scrambles,
        }));
        return;
      } catch (error) {
        errors.push(normalizeError(error, generator.id));
      }
    }

    if (errors.length === 0) {
      errors.push({
        name: 'UnsupportedScrambleMode',
        message: `No scramble generator supports mode "${mode}"`,
        source: 'scramble-service',
      });
    }

    if (this.destroyed) return;
    await this.bus.publish(this.events.create(GENERATION_EVENTS.SCRAMBLE_FAILED, {
      scopeId,
      requestId: event.id,
      errors,
    }));
  }
}
