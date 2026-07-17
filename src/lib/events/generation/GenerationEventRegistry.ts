export const GENERATION_EVENTS = {
  SCRAMBLE_REQUESTED: 'generation.scramble.requested',
  SCRAMBLE_GENERATED: 'generation.scramble.generated',
  SCRAMBLE_FAILED: 'generation.scramble.failed',
  IMAGE_REQUESTED: 'generation.image.requested',
  IMAGE_GENERATED: 'generation.image.generated',
  IMAGE_RETRYING: 'generation.image.retrying',
  IMAGE_FAILED: 'generation.image.failed',
} as const;

export type GenerationEventType = (typeof GENERATION_EVENTS)[keyof typeof GENERATION_EVENTS];
