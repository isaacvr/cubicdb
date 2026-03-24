# Error Handling

## Principio

Los errores se clasifican en dos categorías:

1. **Errores esperados**: condiciones que pueden ocurrir durante el uso normal.
   Se manejan con el tipo `Result<T, E>` y se propagan de forma explícita.

2. **Errores inesperados**: bugs, fallos de infraestructura, estados imposibles.
   Se dejan propagar como excepciones y se capturan en boundaries.

## Result Type

Para errores esperados, usar un tipo Result en vez de lanzar excepciones:

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

### Uso en use cases

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

### Uso en el caller

```ts
const result = await createSolveUseCase.execute(params);

if (!result.ok) {
  // manejar error explícitamente
  eventBus.emit(new ErrorOccurred(result.error));
  return;
}

// usar result.value con seguridad de tipos
const solve = result.value;
```

## Errores de dominio

Cada dominio define sus propios tipos de error:

```ts
// Errores del timer
type TimerError =
  | { code: 'INVALID_STATE'; message: string }
  | { code: 'DEVICE_NOT_CONNECTED'; deviceId: string }
  | { code: 'SCRAMBLE_GENERATION_FAILED'; mode: string; errors: GeneratorError[] };

// Errores de sesión
type SessionError =
  | { code: 'SESSION_NOT_FOUND'; sessionId: string }
  | { code: 'DUPLICATE_NAME'; name: string };

// Errores de solve
type SolveError =
  | { code: 'INVALID_TIME'; message: string }
  | { code: 'SOLVE_NOT_FOUND'; solveId: string }
  | { code: 'PENALTY_NOT_EDITABLE'; reason: string };
```

## Errores en Event Handlers

Los handlers del EventBus **nunca deben lanzar excepciones sin capturar**.
Si un handler falla, debe emitir un evento de error:

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

## Evento de error global

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

La UI se suscribe a `ErrorOccurred` para mostrar notificaciones al usuario
cuando corresponda.

## Boundaries (errores inesperados)

Los errores inesperados se capturan en el nivel más alto posible:

- **Componentes Svelte**: `onMount` con try/catch, o Svelte error boundaries.
- **EventBus**: el `emit()` ya captura errores de handlers (ver EventBus.ts:91).
- **Workers**: `onerror` handler.

## Qué NO hacer

- No usar `try/catch` como flujo de control normal.
- No silenciar errores con `catch () {}`.
- No lanzar strings (`throw "error"`), siempre objetos tipados.
- No mezclar Result y excepciones en la misma capa.
