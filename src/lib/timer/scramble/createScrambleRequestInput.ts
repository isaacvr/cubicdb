import type {
  ScrambleProbability,
  ScrambleRequestInput,
  ScrambleRequestSource,
} from '$lib/events/timer/ScrambleEventTypes';

export interface ScrambleRequestResolutionInput {
  selectedMode: { 0: string; 1: string; 2: number };
  selectedProbability: ScrambleProbability;
  modeOverride?: string;
  lengthOverride?: number;
  probabilityOverride?: ScrambleProbability;
  providedScramble?: string;
  source: ScrambleRequestSource;
}

export function createScrambleRequestInput(
  input: ScrambleRequestResolutionInput,
): ScrambleRequestInput {
  const mode = (input.modeOverride ?? input.selectedMode[1]).trim();
  if (!mode) throw new Error('Scramble mode is required');
  const randomStateLength = (mode === 'r3' || mode === 'r3ni')
    && typeof input.selectedProbability === 'number'
    ? input.selectedProbability
    : input.selectedMode[2];
  const result: ScrambleRequestInput = {
    mode,
    length: input.lengthOverride ?? randomStateLength,
    probability: input.probabilityOverride ?? input.selectedProbability,
    source: input.source,
  };
  if (input.providedScramble !== undefined) result.providedScramble = input.providedScramble;
  return result;
}
