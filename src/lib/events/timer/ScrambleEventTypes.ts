export const SCRAMBLE_REQUEST_SOURCES = {
  SOLVE_COMPLETED: 'solve-completed',
  USER_REQUESTED: 'user-requested',
  RUNNING_CANCELLED: 'running-cancelled',
  SESSION_SCRAMBLE_SETTINGS_CHANGED: 'session-scramble-settings-changed',
} as const;

export type ScrambleRequestSource =
  (typeof SCRAMBLE_REQUEST_SOURCES)[keyof typeof SCRAMBLE_REQUEST_SOURCES];

export type ScrambleProbability = number | number[];

export interface ScrambleRequestInput {
  mode: string;
  length: number;
  probability: ScrambleProbability;
  source: ScrambleRequestSource;
  providedScramble?: string;
}

export const SCRAMBLE_PREVIEW_CLEAR_REASONS = {
  NEW_SCRAMBLE: 'new-scramble',
  IMAGES_DISABLED: 'images-disabled',
  UNSUPPORTED_MODE: 'unsupported-mode',
  GENERATION_FAILED: 'generation-failed',
} as const;

export type ScramblePreviewClearReason =
  (typeof SCRAMBLE_PREVIEW_CLEAR_REASONS)[keyof typeof SCRAMBLE_PREVIEW_CLEAR_REASONS];

export interface NormalizedScrambleError {
  name: string;
  message: string;
}
