import { GENERATION_EVENTS } from "$lib/events/generation";
import type { ImageGenerationConfig, ScrambleGenerationConfig } from "$lib/events/generation";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

export interface GenerationRequestEmitterInput<TConfig> {
  scopeId: string;
  config: TConfig;
  sourceEvent?: NativeTimestampSource;
}

export function createGenerationEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestScramble(input: GenerationRequestEmitterInput<ScrambleGenerationConfig>) {
      return emit(
        GENERATION_EVENTS.SCRAMBLE_REQUESTED,
        { scopeId: input.scopeId, config: input.config },
        input.sourceEvent ? { sourceEvent: input.sourceEvent } : undefined
      );
    },
    requestImage(input: GenerationRequestEmitterInput<ImageGenerationConfig>) {
      return emit(
        GENERATION_EVENTS.IMAGE_REQUESTED,
        { scopeId: input.scopeId, config: input.config },
        input.sourceEvent ? { sourceEvent: input.sourceEvent } : undefined
      );
    },
  };
}
