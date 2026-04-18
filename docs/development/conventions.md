# Code Conventions

## Language

All documentation must be written in English. This includes code comments, commit messages, PR descriptions, doc files, and inline documentation. The only exception is i18n translation files (`src/lib/lang/`), which contain localized UI strings by design.

## Naming

| Element | Convention | Example |
|---|---|---|
| Archivos de clase/componente | `PascalCase` | `TimerReactor.ts`, `KeyboardDevice.ts` |
| Archivos de servicio | `PascalCase` | `ScrambleService.ts` |
| Archivos de tipos/interfaces | `PascalCase` | `ISolveRepository.ts` |
| Archivos de constantes | `PascalCase` | `Routes.ts`, `TimerConstants.ts` |
| Archivos de test | `PascalCase.test.ts` | `TimerReactor.test.ts` |
| Clases | `PascalCase` | `EventBus`, `ScrambleService` |
| Interfaces/Types | `I` prefix | `IEventBus`, `ISessionRepository` |
| Use cases | `PascalCase` + sufijo `UseCase` | `CreateSolveUseCase` |
| Event handlers | `on` + acción + `Handler` | `onClickHandler`, `onSolveCreatedHandler` |
| Domain events | `PascalCase` (sustantivo) | `DeviceStopped`, `SolveAdded` |
| Variables/funciones | `camelCase` | `timerState`, `generateScramble` |
| Constantes | `UPPER_SNAKE_CASE` | `TIMER_ROUTE`, `MAX_INSPECTION_TIME` |
| Svelte components | `PascalCase` | `TimerDisplay.svelte`, `SolveList.svelte` |

## Estructura de carpetas (target)

```
src/lib/
├── core/                      # Dominio puro, sin dependencias de framework
│   ├── domain/                # Entidades y value objects
│   ├── ports/                 # Interfaces (I*Repository, I*Service)
│   └── usecases/              # Casos de uso (*UseCase)
│
├── events/                    # Sistema de eventos
│   ├── domain/                # Definiciones de eventos (DomainEvent classes)
│   ├── handlers/              # Handlers que reaccionan a eventos
│   ├── EventBus.ts
│   └── types.ts
│
├── services/                  # Implementaciones de servicios
│   ├── ScrambleService.ts
│   └── ...
│
├── adapters/                  # Implementaciones de ports
│   ├── IndexedDBSolveRepository.ts
│   └── ...
│
├── devices/                   # Devices (XState + EventBus)
│   ├── KeyboardDevice.ts
│   ├── StackmatDevice.ts
│   └── ...
│
├── timer/                     # Timer (reactor + UI)
│   ├── TimerReactor.ts
│   ├── TimerState.ts          # $state reactivo
│   ├── Timer.svelte
│   └── ...
│
├── constants/                 # Constantes globales
│   ├── Routes.ts
│   ├── TimerConstants.ts
│   └── ...
│
├── lang/                      # Internacionalización
│   └── ...
│
├── helpers/                   # Funciones puras utilitarias
│   └── ...
│
└── stores/                    # Estado global de la app (migrar a $state)
    └── ...
```

## Constantes de rutas

Todas las rutas se definen en un único lugar y se referencian por nombre:

```ts
// src/lib/constants/Routes.ts

export const ROUTES = {
  TIMER: '/timer',
  TIMER_SESSION: (sessionId: string) => `/timer/${sessionId}`,
  ALGORITHMS: '/algorithms',
  TUTORIALS: '/tutorials',
  TUTORIAL_DETAIL: (id: string) => `/tutorials/${id}`,
  SETTINGS: '/settings',
  CONTESTS: '/contests',
  // ... se construye a demanda
} as const;
```

Nunca hardcodear rutas como strings en componentes. Siempre usar `ROUTES.TIMER_SESSION(id)`.

## Constantes de texto / i18n

Todas las referencias a textos de UI van a través del sistema de internacionalización.
Nunca hardcodear textos visibles al usuario en componentes.

```svelte
<!-- MAL -->
<button>Delete</button>

<!-- BIEN -->
<button>{$localLang.global.delete}</button>
```

Nota: el sistema de i18n actual es manual (objetos TypeScript por idioma).
Se evaluará migración a una librería dedicada (ver docs/development/i18n.md).

## Domain Events

Los eventos son clases inmutables con `readonly` en todas las propiedades:

```ts
export class SolveAdded implements IDomainEvent {
  readonly type = 'SolveAdded';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly solve: ISolve,
    public readonly sessionId: string,
  ) {}
}
```

## Use Cases

Cada use case es una clase con un único método `execute`:

```ts
export class CreateSolveUseCase {
  constructor(private readonly solveRepository: ISolveRepository) {}

  async execute(params: ICreateSolveParams): Promise<ISolve> {
    // validación
    // lógica de negocio
    // persistencia
    // retorno
  }
}
```

## Error Handling

Ver [error-handling.md](error-handling.md) para el patrón completo.

## Svelte 5

- Usar `$state`, `$derived`, `$effect` en lugar de `writable`, `readable`, `derived`.
- Pasar objetos contenedores, nunca propiedades `$state` individuales.
- Los stores existentes se migran incrementalmente.
