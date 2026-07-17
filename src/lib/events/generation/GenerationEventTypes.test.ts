import { describe, expect, expectTypeOf, it } from 'vitest';
import { CubeMode } from '@constants';
import type { CubeView, PuzzleType } from '@interfaces';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import type {
  GenerationEvent,
  GenerationEventPayloadMap,
  GenerationError,
  ImageGenerationConfig,
  ScrambleGenerationResult,
} from './index';

describe('generation event contracts', () => {
  it('defines typed generic generation events', () => {
    expectTypeOf(GENERATION_EVENTS.SCRAMBLE_REQUESTED)
      .toEqualTypeOf<'generation.scramble.requested'>();
    expectTypeOf(GENERATION_EVENTS.IMAGE_RETRYING)
      .toEqualTypeOf<'generation.image.retrying'>();

    expectTypeOf<GenerationEvent>().toMatchTypeOf<{
      id: string;
      type: string;
      timestamp: number;
      payload: object;
    }>();

    expectTypeOf<GenerationEventPayloadMap[typeof GENERATION_EVENTS.SCRAMBLE_REQUESTED]>()
      .toEqualTypeOf<{
        scopeId: string;
        config: {
          mode: string;
          count?: number;
          length?: number;
          probability?: number | number[];
          providedScramble?: string;
          source?: string;
        };
      }>();

    expectTypeOf<ImageGenerationConfig>().toEqualTypeOf<{
      scramble: string;
      puzzle: PuzzleType;
      mode: CubeMode;
      view: CubeView;
      order?: number | number[];
    }>();

    expectTypeOf<ScrambleGenerationResult>().toEqualTypeOf<{
      scopeId: string;
      requestId: string;
      scrambles: string[];
    }>();

    expectTypeOf<GenerationError>().toEqualTypeOf<{
      name: string;
      message: string;
      source?: string;
    }>();
  });

  it('does not overwrite existing timer event names with generation aliases', () => {
    expect(TIMER_EVENTS.SCRAMBLE_REQUESTED).toBe('timer.scramble.requested');
    expect(GENERATION_EVENTS.SCRAMBLE_REQUESTED).toBe('generation.scramble.requested');
  });
});
