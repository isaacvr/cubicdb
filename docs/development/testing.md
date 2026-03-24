# Testing

## Stack

- **Unit + Integration**: Vitest
- **E2E**: Playwright
- **Mocks**: `vi.fn()`, `vi.mock()` (incluidos en Vitest)

## Tipos de tests

### Unit tests

Prueban funciones puras y clases aisladas.

```ts
// NombreDelModulo.test.ts

import { describe, it, expect } from 'vitest';

describe('CreateSolveUseCase', () => {
  it('should create a solve with valid time', async () => {
    const repository = createMockRepository();
    const useCase = new CreateSolveUseCase(repository);

    const result = await useCase.execute({ time: 12340, scramble: "R U R' U'" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.time).toBe(12340);
    }
  });

  it('should return error for invalid time', async () => {
    const repository = createMockRepository();
    const useCase = new CreateSolveUseCase(repository);

    const result = await useCase.execute({ time: -1, scramble: '' });

    expect(result.ok).toBe(false);
  });
});
```

### Integration tests

Prueban flujos completos a través de múltiples componentes.

```ts
// TimerSolveFlow.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';

describe('Timer → Solve flow', () => {
  let eventBus: EventBus;
  let reactor: TimerReactor;
  let state: TimerState;

  beforeEach(() => {
    eventBus = new EventBus();
    state = new TimerState();
    reactor = new TimerReactor(eventBus, state, {
      solveRepository: createMockRepository(),
      scrambleService: createMockScrambleService(),
    });
  });

  it('should save solve when device stops', async () => {
    // Device emite RUNNING
    await eventBus.emit(new DeviceStartedRunning('keyboard'));
    expect(state.timerState).toBe('RUNNING');

    // Device emite STOPPED
    await eventBus.emit(new DeviceStopped('keyboard', 12340));
    expect(state.timerState).toBe('STOPPED');
    expect(state.lastSolve?.time).toBe(12340);
  });

  it('should not save solve on cancel', async () => {
    await eventBus.emit(new DeviceStartedRunning('keyboard'));
    await eventBus.emit(new DeviceCancelled('keyboard'));

    expect(state.timerState).toBe('CLEAN');
    expect(state.time).toBe(0);
    expect(state.lastSolve).toBeNull();
  });
});
```

### EventBus tests

```ts
// EventBus.test.ts

describe('EventBus', () => {
  it('should deliver events to subscribers', async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.subscribe(DeviceStopped, handler);
    await bus.emit(new DeviceStopped('kb', 1000));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].time).toBe(1000);
  });

  it('should process handlers in order', async () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.subscribe(DeviceStopped, () => { order.push(1); }, { priority: 10 });
    bus.subscribe(DeviceStopped, () => { order.push(2); }, { priority: 5 });

    await bus.emit(new DeviceStopped('kb', 1000));

    expect(order).toEqual([1, 2]);
  });
});
```

## Ubicación de tests

Los tests viven junto al código que prueban:

```
src/lib/
├── events/
│   ├── EventBus.ts
│   └── EventBus.test.ts          ← unit test
├── timer/
│   ├── TimerReactor.ts
│   ├── TimerReactor.test.ts      ← unit test
│   └── TimerSolveFlow.integration.test.ts  ← integration
├── helpers/
│   ├── Timer.ts
│   └── Timer.test.ts
```

## Convenciones

- Archivos: `NombreDelModulo.test.ts` o `NombreDelFlujo.integration.test.ts`
- Usar `describe` para agrupar por clase/módulo
- Usar `it` con descripción en inglés que lea como una oración
- Un `expect` por concepto (puede haber varios asserts si validan lo mismo)
- Mocks solo en boundaries (repositorios, servicios externos). Nunca mockear el EventBus en integration tests.
- No hay coverage mínimo por ahora. Las partes críticas (Timer, EventBus, use cases) deben tener tests.
