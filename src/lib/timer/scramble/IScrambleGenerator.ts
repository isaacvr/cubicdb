import type { ScrambleProbability } from '$lib/events/timer/ScrambleEventTypes';

export interface ScrambleGeneratorRequest {
  mode: string;
  length: number;
  probability: ScrambleProbability;
}

export interface IScrambleGenerator {
  readonly id: string;
  supports(mode: string): boolean;
  generate(request: ScrambleGeneratorRequest): string | null | Promise<string | null>;
}
