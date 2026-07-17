import type { Puzzle } from '@classes/puzzle/puzzle';
import { pScramble } from '@cstimer/scramble';
import { pGenerateCubeBundle } from '@helpers/cube-draw';
import { scrambleToPuzzle } from '@helpers/scrambleToPuzzle';
import type { ImageGenerationConfig } from '$lib/events/generation';
import type { PuzzleType } from '@interfaces';
import type { IScramblePreviewGenerator } from './IScramblePreviewGenerator';
import type { IImageGenerator } from './IImageGenerator';

interface CubeBundleScramblePreviewDependencies {
  supports(mode: string): boolean;
  toPuzzle(scramble: string, mode: string): Puzzle[];
  draw(
    cubes: Puzzle[],
    width: number,
    inCube: boolean,
    printable: boolean,
    cache: boolean,
  ): Promise<string[]>;
}

const DEFAULT_DEPENDENCIES: CubeBundleScramblePreviewDependencies = {
  supports: mode => pScramble.options.has(mode),
  toPuzzle: scrambleToPuzzle,
  draw: pGenerateCubeBundle,
};

function orderToNumber(order: number | number[] | undefined): number {
  if (Array.isArray(order)) return order[0] ?? 3;
  return order ?? 3;
}

function resolveScrambleMode(config: ImageGenerationConfig): string {
  if (config.puzzle === 'rubik' || config.puzzle === 'icarry') {
    const order = orderToNumber(config.order);
    return `${order}${order}${order}`;
  }
  return config.puzzle as PuzzleType;
}

export class CubeBundleScramblePreviewGenerator implements IScramblePreviewGenerator, IImageGenerator {
  constructor(
    private readonly dependencies: CubeBundleScramblePreviewDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  supports(config: string | ImageGenerationConfig): boolean {
    const mode = typeof config === 'string' ? config : resolveScrambleMode(config);
    return this.dependencies.supports(mode);
  }

  generate(config: ImageGenerationConfig): Promise<string[]>;
  generate(scramble: string, mode: string): Promise<string[]>;
  generate(configOrScramble: ImageGenerationConfig | string, mode?: string): Promise<string[]> {
    const config = typeof configOrScramble === 'string'
      ? null
      : configOrScramble;
    const scramble = typeof configOrScramble === 'string'
      ? configOrScramble
      : configOrScramble.scramble;
    const scrambleMode = mode ?? (config ? resolveScrambleMode(config) : '333');
    const cubes = this.dependencies.toPuzzle(scramble, scrambleMode);
    if (config) {
      for (const cube of cubes) cube.view = config.view;
    }
    return this.dependencies.draw(cubes, 500, false, false, false);
  }
}
