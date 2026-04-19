/**
 * Result type for explicit error handling.
 * Use for expected errors (validation, business rules).
 * Let unexpected errors (bugs) propagate as exceptions.
 */
export type Result<T, E = AppError> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Transform a success value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

/**
 * Chain operations that return Result
 */
export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/**
 * Execute side effect on success
 */
export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
  if (result.ok) {
    fn(result.value);
  }
  return result;
}

/**
 * Handle error
 */
export function catchError<T, E, U>(result: Result<T, E>, handler: (error: E) => Result<T, U>): Result<T, U> {
  return result.ok ? result : handler(result.error);
}

/**
 * Get the value or a default
 */
export function getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Get the value or throw
 */
export function getOrThrow<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    if (result.error instanceof Error) {
      throw result.error;
    }
    throw new Error(`Result error: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

/**
 * Check if Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Check if Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Combine multiple results
 * Returns Ok with array of all values if all succeed, otherwise first error
 */
export function combine<T, E>(...results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return Ok(values);
}

/**
 * Try to execute a function and catch errors
 */
export function tryCatch<T, E extends Error = Error>(
  fn: () => T,
  errorTransform?: (error: E) => E
): Result<T, E> {
  try {
    return Ok(fn());
  } catch (error) {
    const err = error as E;
    return Err(errorTransform ? errorTransform(err) : err);
  }
}

/**
 * Convert a Promise to Result
 */
export async function fromPromise<T, E extends Error = Error>(
  promise: Promise<T>,
  errorTransform?: (error: E) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    const err = error as E;
    return Err(errorTransform ? errorTransform(err) : err);
  }
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
