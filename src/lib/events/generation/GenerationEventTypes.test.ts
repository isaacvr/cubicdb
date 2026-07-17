import { describe, expectTypeOf, it } from 'vitest';
import { CubeMode } from '@constants';
import type { CubeView, PuzzleType } from '@interfaces';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import type {
  GenerationEvent,
  GenerationEventPayloadMap,
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
  });
});
