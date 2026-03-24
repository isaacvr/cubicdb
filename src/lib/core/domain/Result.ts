/**
 * Result type for explicit error handling.
 * Use for expected errors (validation, business rules).
 * Let unexpected errors (bugs) propagate as exceptions.
 */
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface AppError {
  code: string;
  message: string;
}

export type TimerError =
  | { code: 'INVALID_STATE'; message: string }
  | { code: 'DEVICE_NOT_CONNECTED'; deviceId: string; message: string }
  | { code: 'SCRAMBLE_GENERATION_FAILED'; mode: string; message: string };

export type SessionError =
  | { code: 'SESSION_NOT_FOUND'; sessionId: string; message: string }
  | { code: 'DUPLICATE_NAME'; name: string; message: string };

export type SolveError =
  | { code: 'INVALID_TIME'; message: string }
  | { code: 'SOLVE_NOT_FOUND'; solveId: string; message: string }
  | { code: 'PENALTY_NOT_EDITABLE'; reason: string; message: string };
