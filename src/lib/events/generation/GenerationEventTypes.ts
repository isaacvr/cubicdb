import type { CubeMode } from '@constants';
import type { CubeView, PuzzleType } from '@interfaces';
import { GENERATION_EVENTS } from './GenerationEventRegistry';

export type GenerationProbability = number | number[];

export interface GenerationError {
  name: string;
  message: string;
}

export interface ScrambleGenerationConfig {
  mode: string;
  count?: number;
  length?: number;
  probability?: GenerationProbability;
  providedScramble?: string;
  source?: string;
}

export interface ImageGenerationConfig {
  scramble: string;
  puzzle: PuzzleType;
  mode: CubeMode;
  view: CubeView;
  order?: number | number[];
}

export interface ScrambleGenerationResult {
  scopeId: string;
  requestId: string;
  scrambles: string[];
}

export interface ImageGenerationResult {
  scopeId: string;
  requestId: string;
  images: string[];
}

export interface GenerationFailurePayload {
  scopeId: string;
  requestId: string;
  errors: GenerationError[];
}

export interface ImageGenerationRetryPayload {
  scopeId: string;
  requestId: string;
  attempt: number;
  error: GenerationError;
}

export const GENERATION_EVENT_GROUPS = {
  SCRAMBLE: [
    GENERATION_EVENTS.SCRAMBLE_REQUESTED,
    GENERATION_EVENTS.SCRAMBLE_GENERATED,
    GENERATION_EVENTS.SCRAMBLE_FAILED,
  ],
  IMAGE: [
    GENERATION_EVENTS.IMAGE_REQUESTED,
    GENERATION_EVENTS.IMAGE_GENERATED,
    GENERATION_EVENTS.IMAGE_RETRYING,
    GENERATION_EVENTS.IMAGE_FAILED,
  ],
} as const;
