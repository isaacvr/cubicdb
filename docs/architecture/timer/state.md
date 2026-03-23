# State Management

## Tres mecanismos, tres propósitos

| Mecanismo | Propósito | Ejemplo |
|---|---|---|
| **EventBus** | Eventos de dominio discretos. Fuente de verdad. | `DeviceStopped`, `SolveAdded`, `SessionSwitched` |
| **Svelte 5 `$state`** | Capa reactiva para la UI. Subordinada a eventos. | `timerState`, `time`, `scramble`, `solves[]` |
| **Svelte context** | Inyección de dependencias en árboles de componentes. | Pasar el timer controller a componentes hijos |

### Regla fundamental

**Los eventos mandan, `$state` obedece.** Cuando llega un evento, el reactor actualiza el `$state`. La UI reacciona al `$state`. Nunca al revés.

```
Evento llega → Reactor actualiza $state → UI se re-renderiza
```

## Svelte 5 Runes (reemplazo de stores)

### Antes (stores)

```ts
class TimerController {
  timerState = writable(TimerState.CLEAN);
  time = writable(0);
  ready = writable(false);
}

// Uso en componente
const state = get(timerController.timerState);
timerController.timerState.set(TimerState.RUNNING);
```

### Después ($state)

```ts
class TimerState {
  timerState = $state(TimerState.CLEAN);
  time = $state(0);
  ready = $state(false);
  scramble = $state('');
  solves: Solve[] = $state([]);
  // ...
}
```

### Cuidados con $state en clases

El problema principal con `$state` fuera de componentes es la reactividad al pasar referencias.
Cuando se pasa una propiedad `$state` a otro contexto, se debe pasar como getter, no como valor directo:

```ts
// MAL: pierde reactividad
const time = timerState.time; // copia del valor, no reactivo

// BIEN: mantener referencia al objeto
const state = timerState; // acceder via state.time (reactivo)

// BIEN: getter explícito si se necesita pasar un valor individual
function getTime() { return timerState.time; }
```

La regla: pasar el objeto contenedor, no propiedades individuales.
Los componentes acceden a `state.time`, no a `time` directamente.

## Reactor con $state

```ts
class TimerReactor {
  constructor(
    private eventBus: IEventBus,
    private state: TimerState,
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.eventBus.subscribe(DeviceEnteredPrevention, () => {
      this.state.timerState = TimerState.PREVENTION;
      this.state.time = 0;
      this.state.ready = false;
    });

    this.eventBus.subscribe(DeviceStopped, (e) => {
      this.state.timerState = TimerState.STOPPED;
      this.state.time = e.time;
      // side effects...
    });

    // ...
  }
}
```

## Estado global accesible

Cada sección de la app tiene su propio estado. No se comparten entre secciones
excepto en casos muy específicos (e.g., iCarry conectado disponible para tutoriales).

Para esos casos cross-section, el EventBus es el canal de comunicación,
nunca acceso directo al estado de otra sección.

## EventBus: orden de procesamiento

Los eventos se procesan en el orden en que llegan, secuencialmente.
Cada handler debe completarse antes de que se ejecute el siguiente.
Esto garantiza que el estado sea consistente (e.g., solve guardado antes de recalcular stats).
