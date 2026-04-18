# Error Handling

## Principle

Errors are classified into two categories:

1. **Expected errors**: conditions that can occur during normal use.
   Handled with the `Result<T, E>` type and propagated explicitly.

2. **Unexpected errors**: bugs, infrastructure failures, impossible states.
   Allowed to propagate as exceptions and caught at boundaries.

## Result Type

For expected errors, use a Result type instead of throwing exceptions:

```ts
// src/lib/core/domain/Result.ts

type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### Usage in Use Cases

```ts
class CreateSolveUseCase {
  async execute(params: ICreateSolveParams): Promise<Result<ISolve, SolveError>> {
    if (!params.time && params.time !== 0) {
      return Err({ code: 'INVALID_TIME', message: 'Time is required' });
    }

    const solve = await this.repository.save(params);
    return Ok(solve);
  }
}
```

### Usage in the Caller

```ts
const result = await createSolveUseCase.execute(params);

if (!result.ok) {
  // handle error explicitly
  eventBus.emit(new ErrorOccurred(result.error));
  return;
}

// use result.value with type safety
const solve = result.value;
```

## Domain Errors

Each domain defines its own error types:

```ts
// Timer errors
type TimerError =
  | { code: 'INVALID_STATE'; message: string }
  | { code: 'DEVICE_NOT_CONNECTED'; deviceId: string }
  | { code: 'SCRAMBLE_GENERATION_FAILED'; mode: string; errors: GeneratorError[] };

// Session errors
type SessionError =
  | { code: 'SESSION_NOT_FOUND'; sessionId: string }
  | { code: 'DUPLICATE_NAME'; name: string };

// Solve errors
type SolveError =
  | { code: 'INVALID_TIME'; message: string }
  | { code: 'SOLVE_NOT_FOUND'; solveId: string }
  | { code: 'PENALTY_NOT_EDITABLE'; reason: string };
```

## Errors in Event Handlers

EventBus handlers **must never throw uncaught exceptions**.
If a handler fails, it must emit an error event:

```ts
eventBus.subscribe(DeviceStopped, async (event) => {
  const result = await createSolveUseCase.execute({
    time: event.time,
    scramble: currentScramble,
    // ...
  });

  if (!result.ok) {
    await eventBus.emit(new ErrorOccurred(result.error));
    return;
  }

  await eventBus.emit(new SolveAdded(result.value));
});
```

## Global Error Event

```ts
export class ErrorOccurred implements IDomainEvent {
  readonly type = 'ErrorOccurred';
  readonly timestamp = Date.now();

  constructor(
    public readonly error: AppError,
    public readonly context?: string,
  ) {}
}
```

The UI subscribes to `ErrorOccurred` to show notifications to the user
when appropriate.

## Boundaries (Unexpected Errors)

Unexpected errors are caught at the highest possible level:

- **Svelte components**: `onMount` with try/catch, or Svelte error boundaries.
- **EventBus**: `emit()` already catches handler errors (see EventBus.ts:91).
- **Workers**: `onerror` handler.

## What NOT to Do

- Don't use `try/catch` as normal control flow.
- Don't silence errors with `catch () {}`.
- Don't throw strings (`throw "error"`), always use typed objects.
- Don't mix Result and exceptions in the same layer.
