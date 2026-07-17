import { CubeMode } from '@constants';
import { pScramble } from '@cstimer/scramble';
import type { ImageGenerationConfig } from '$lib/events/generation';
import type { CubeView, PuzzleOptions } from '@interfaces';

export interface CreateImageGenerationConfigInput {
  scramble: string;
  scrambleMode: string;
  getOptions?: (mode: string) => PuzzleOptions | PuzzleOptions[] | undefined;
}

function firstOption(
  options: PuzzleOptions | PuzzleOptions[] | undefined,
): PuzzleOptions | undefined {
  return Array.isArray(options) ? options[0] : options;
}

export function createImageGenerationConfig(
  input: CreateImageGenerationConfigInput,
): ImageGenerationConfig {
  const options = firstOption(
    (input.getOptions ?? (mode => pScramble.options.get(mode)))(input.scrambleMode),
  );

  return {
    scramble: input.scramble,
    scrambleMode: input.scrambleMode,
    puzzle: options?.type ?? 'rubik',
    mode: options?.mode ?? CubeMode.NORMAL,
    view: options?.view ?? 'trans' as CubeView,
    order: options?.order ?? [3, 3, 3],
  };
}
