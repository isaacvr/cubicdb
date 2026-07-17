import type { GenerationEventPayloadMap } from './GenerationEventPayloadMap';
import type { GenerationEventType } from './GenerationEventRegistry';

export type GenerationEvent<K extends GenerationEventType = GenerationEventType> =
  K extends GenerationEventType ? {
    id: string;
    type: K;
    timestamp: number;
    payload: GenerationEventPayloadMap[K];
  } : never;
