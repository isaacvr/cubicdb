import { getScramble, pScramble } from '@cstimer/scramble';
import { rndEl } from '@cstimer/lib/mathlib';
import type { IScrambleGenerator, ScrambleGeneratorRequest } from './IScrambleGenerator';

interface CSTimerScrambleGeneratorDependencies {
  generate(mode: string, length: number, probability: number): string;
  supports(mode: string): boolean;
  selectProbability(values: number[]): number;
}

const DEFAULT_DEPENDENCIES: CSTimerScrambleGeneratorDependencies = {
  generate: getScramble,
  supports: mode => pScramble.scramblers.has(mode),
  selectProbability: values => rndEl(values),
};

export class CSTimerScrambleGenerator implements IScrambleGenerator {
  readonly id = 'cstimer';

  constructor(
    private readonly dependencies: CSTimerScrambleGeneratorDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  supports(mode: string): boolean {
    return this.dependencies.supports(mode);
  }

  generate(request: ScrambleGeneratorRequest): string {
    const probability = Array.isArray(request.probability)
      ? this.dependencies.selectProbability(request.probability)
      : request.probability;
    return this.dependencies.generate(request.mode, request.length, probability);
  }
}
