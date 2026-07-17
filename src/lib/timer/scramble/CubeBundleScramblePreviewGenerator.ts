import type { Puzzle } from '@classes/puzzle/puzzle';
import { pScramble } from '@cstimer/scramble';
import { pGenerateCubeBundle } from '@helpers/cube-draw';
import { scrambleToPuzzle } from '@helpers/scrambleToPuzzle';
import type { IScramblePreviewGenerator } from './IScramblePreviewGenerator';

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

export class CubeBundleScramblePreviewGenerator implements IScramblePreviewGenerator {
  constructor(
    private readonly dependencies: CubeBundleScramblePreviewDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  supports(mode: string): boolean {
    return this.dependencies.supports(mode);
  }

  generate(scramble: string, mode: string): Promise<string[]> {
    const cubes = this.dependencies.toPuzzle(scramble, mode);
    return this.dependencies.draw(cubes, 500, false, false, false);
  }
}
