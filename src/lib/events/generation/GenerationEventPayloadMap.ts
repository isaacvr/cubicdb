import { GENERATION_EVENTS } from "./GenerationEventRegistry";
import type {
  GenerationFailurePayload,
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageGenerationRetryPayload,
  ScrambleGenerationConfig,
  ScrambleGenerationResult,
} from "./GenerationEventTypes";

export interface GenerationEventPayloadMap {
  [GENERATION_EVENTS.SCRAMBLE_REQUESTED]: {
    scopeId: string;
    config: ScrambleGenerationConfig;
  };
  [GENERATION_EVENTS.SCRAMBLE_GENERATED]: ScrambleGenerationResult;
  [GENERATION_EVENTS.SCRAMBLE_FAILED]: GenerationFailurePayload;
  [GENERATION_EVENTS.IMAGE_REQUESTED]: {
    scopeId: string;
    config: ImageGenerationConfig;
  };
  [GENERATION_EVENTS.IMAGE_GENERATED]: ImageGenerationResult;
  [GENERATION_EVENTS.IMAGE_RETRYING]: ImageGenerationRetryPayload;
  [GENERATION_EVENTS.IMAGE_FAILED]: GenerationFailurePayload;
}
