# Result Type & Error Handling

This document defines the `Result<T, E>` type for error handling and validation failures.

---

## Rationale

The app distinguishes between:

1. **Errors as part of the domain** — Validation failures, expected exceptions (Result type)
2. **Unexpected bugs** — Programming errors (Exceptions)

```
❌ Bad: throw new Error("validation failed")
✅ Good: return Err("validation failed")

❌ Bad: return null if user not found
✅ Good: return Err("user_not_found")

❌ Bad: catch (e) { showNotification(e.message) }
✅ Good: match(result, { Ok: show, Err: showError })
```

---

## Result Type Definition

```ts
/**
 * Result represents the outcome of an operation.
 * Either a successful value (Ok) or an error (Err).
 */
export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly tag = 'Ok';
  constructor(public readonly value: T) {}
  
  isOk(): boolean { return true; }
  isErr(): boolean { return false; }
  
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }
  
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }
  
  getOr(defaultValue: T): T {
    return this.value;
  }
  
  // etc...
}

export class Err<E> {
  readonly tag = 'Err';
  constructor(public readonly error: E) {}
  
  isOk(): boolean { return false; }
  isErr(): boolean { return true; }
  
  map<U>(fn: (value: T) => U): Result<U, E> {
    return this as any;
  }
  
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this as any;
  }
  
  getOr(defaultValue: T): T {
    return defaultValue;
  }
  
  // etc...
}

// Factory functions
export const Ok = <T>(value: T): Result<T, any> => new Ok(value);
export const Err = <E>(error: E): Result<any, E> => new Err(error);
```

---

## Error Type Definition

Each domain has its own error enum or type:

### Timer Errors

```ts
export enum TimerError {
  DEVICE_NOT_FOUND = 'device_not_found',
  DEVICE_INCOMPATIBLE = 'device_incompatible',
  DEVICE_DISCONNECTED = 'device_disconnected',
  TIMER_NOT_CLEAN = 'timer_not_clean',
  SESSION_NOT_FOUND = 'session_not_found',
  INVALID_PENALTY = 'invalid_penalty',
  SCRAMBLE_GENERATION_FAILED = 'scramble_generation_failed',
}
```

### Repository Errors

```ts
export enum RepositoryError {
  NOT_FOUND = 'not_found',
  DUPLICATE = 'duplicate',
  VALIDATION_FAILED = 'validation_failed',
  PERSISTENCE_FAILED = 'persistence_failed',
  UNKNOWN = 'unknown',
}
```

### Device Errors

```ts
export enum DeviceError {
  NOT_FOUND = 'not_found',
  DISCOVERY_FAILED = 'discovery_failed',
  CONNECTION_FAILED = 'connection_failed',
  DISCONNECTED = 'disconnected',
  INCOMPATIBLE = 'incompatible',
  TIMEOUT = 'timeout',
  INVALID_DATA = 'invalid_data',
}
```

---

## Usage Examples

### In Use Cases

```ts
export class AddSolve {
  async execute(solve: Partial<Solve>): Promise<Result<Solve, RepositoryError>> {
    // Validate
    if (!solve.time || solve.time <= 0) {
      return Err(RepositoryError.VALIDATION_FAILED);
    }
    
    // Persist
    try {
      const added = await this.repo.add(new Solve(solve));
      return Ok(added);
    } catch (error) {
      return Err(RepositoryError.PERSISTENCE_FAILED);
    }
  }
}
```

### In Handlers

```ts
eventBus.subscribe(SolveAdded, async (event) => {
  const result = await calculateStatsUseCase.execute(event.solve.sessionId);
  
  match(result, {
    Ok: (stats) => {
      state.statistics = stats;
      logger.info('handler', 'Statistics updated');
    },
    Err: (error) => {
      logger.error('handler', 'Failed to calculate statistics', { error });
      await eventBus.emit(new HandlerError('StatisticsHandler', error));
    },
  });
});
```

### In Components

```svelte
<script>
  async function saveSolve() {
    const result = await addSolveUseCase.execute(newSolve);
    
    if (result.isOk()) {
      showNotification('Solve saved!');
      solveList = [...solveList, result.value];
    } else {
      showError(`Failed to save: ${result.error}`);
    }
  }
</script>
```

---

## Pattern: match()

For discriminated union handling:

```ts
function match<T, E, R>(
  result: Result<T, E>,
  pattern: { Ok: (value: T) => R; Err: (error: E) => R },
): R {
  if (result.isOk()) {
    return pattern.Ok(result.value);
  } else {
    return pattern.Err(result.error);
  }
}

// Usage
const message = match(result, {
  Ok: (solve) => `Added solve: ${solve.time}ms`,
  Err: (error) => `Error: ${error}`,
});
```

---

## Exception vs Result

### Use Exceptions For:
- **Unexpected programmer errors** → `throw new Error("invariant violated")`
- **System failures** → `throw new Error("database connection lost")`
- **Should not happen** → `throw new AssertionError("unreachable code")`

### Use Result For:
- **Validation failures** → `Err("invalid_email")`
- **Not found** → `Err("user_not_found")`
- **Business rule violations** → `Err("cannot_delete_last_session")`
- **Expected failures** → `Err("device_disconnected")`

---

## Event Error Propagation

When a handler encounters an error, emit an error event:

```ts
export class HandlerError implements DomainEvent {
  readonly type = 'HandlerError';
  readonly timestamp = Date.now();

  constructor(
    public readonly handlerName: string,
    public readonly message: string,
    public readonly originalError?: unknown,
  ) {}
}
```

UI subscribes to this and shows notifications:

```ts
eventBus.subscribe(HandlerError, async (event) => {
  logger.error('system', `Handler error: ${event.handlerName}`, { 
    message: event.message,
    error: event.originalError,
  });
  
  // Show user notification
  showNotification(`Something went wrong: ${event.message}`, 'error');
});
```

---

## Logging & Diagnostics

Always log when returning an error:

```ts
async execute(data: Input): Promise<Result<Output, MyError>> {
  try {
    const result = await operation();
    logger.debug('usecase', 'Operation succeeded', { result });
    return Ok(result);
  } catch (error) {
    logger.error('usecase', 'Operation failed', { 
      error: error instanceof Error ? error.message : String(error),
      data,
    });
    return Err(MyError.OPERATION_FAILED);
  }
}
```

---

## TypeScript Strict Mode

When using Result types:

```ts
// ❌ Bad: assumes Ok
const solve = result.value; // Property 'value' does not exist on type 'Err'

// ✅ Good: explicitly handle both cases
if (result.isOk()) {
  const solve = result.value; // TypeScript knows it's Ok
}

// ✅ Good: use match
match(result, {
  Ok: (solve) => { /* ... */ },
  Err: (error) => { /* ... */ },
});

// ✅ Good: use getOr with default
const solve = result.getOr(fallbackSolve);
```

---

## Chaining Operations

```ts
// Chaining with flatMap
async function workflow(): Promise<Result<Output, Error>> {
  const result1 = await step1();
  
  return result1.flatMap((value1) => {
    const result2 = step2(value1);
    return result2.flatMap((value2) => {
      return step3(value2);
    });
  });
}

// Or with async/await pattern
async function workflow(): Promise<Result<Output, Error>> {
  const r1 = await step1();
  if (r1.isErr()) return r1;
  
  const r2 = await step2(r1.value);
  if (r2.isErr()) return r2;
  
  return step3(r2.value);
}
```

---

## Discriminated Unions

For more complex error types:

```ts
export type AppError = 
  | { tag: 'validation_error'; field: string; message: string }
  | { tag: 'not_found'; entity: string; id: string }
  | { tag: 'permission_denied'; action: string }
  | { tag: 'internal_error'; message: string };

type AppResult<T> = Result<T, AppError>;

// In handler
const result: AppResult<Solve> = await addSolve();

match(result, {
  Ok: (solve) => { /* handle success */ },
  Err: (error) => {
    switch (error.tag) {
      case 'validation_error':
        showFieldError(error.field, error.message);
        break;
      case 'not_found':
        showError(`${error.entity} not found`);
        break;
      // ...
    }
  },
});
```

