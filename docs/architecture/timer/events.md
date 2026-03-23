# Timer Events

## Timer Input Events (Device → Timer)

Notificaciones que los devices emiten. Son hechos consumados, no solicitudes.

```ts
// src/lib/events/domain/TimerEvents.ts

import type { DomainEvent } from '../types';
import type { Penalty } from '@interfaces';

/**
 * Device notifica que entró en estado de prevención.
 * Timer reacciona: muestra estado PREVENTION en UI.
 */
export class DeviceEnteredPrevention implements DomainEvent {
  readonly type = 'DeviceEnteredPrevention';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que la inspección comenzó.
 * Timer reacciona: muestra countdown de inspección en UI.
 */
export class DeviceStartedInspection implements DomainEvent {
  readonly type = 'DeviceStartedInspection';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que la prevención terminó.
 * Ocurre entre PREVENTION e INSPECTION.
 * Timer reacciona: prepara el solve (crea lastSolve).
 * NO activa el flag ready. El flag ready se activa por separado, justo antes de RUNNING.
 */
export class DeviceReady implements DomainEvent {
  readonly type = 'DeviceReady';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que el usuario está a punto de arrancar (green light).
 * Se emite justo antes de RUNNING:
 *   - Sin inspección: inmediatamente después de READY.
 *   - Con inspección: cuando el usuario presiona space durante INSPECTION.
 * Timer reacciona: activa flag ready=true.
 */
export class DeviceGreenLight implements DomainEvent {
  readonly type = 'DeviceGreenLight';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que el cronómetro está corriendo.
 * Timer reacciona: muestra estado RUNNING.
 * El tiempo real se recibe por canal directo (onTimeUpdate), no por EventBus.
 */
export class DeviceStartedRunning implements DomainEvent {
  readonly type = 'DeviceStartedRunning';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que el cronómetro se detuvo.
 * Timer reacciona: guarda solve, calcula stats, genera scramble.
 *
 * @param time - Tiempo final en milisegundos.
 *   - Keyboard/Virtual: tiempo medido por el device.
 *   - Stackmat/External: tiempo reportado por el hardware.
 * @param steps - Tiempos parciales para multi-step sessions.
 */
export class DeviceStopped implements DomainEvent {
  readonly type = 'DeviceStopped';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly time: number,
    public readonly steps?: number[],
  ) {}
}

/**
 * Device notifica que se pausó el cronómetro.
 * Timer reacciona: congela la UI.
 */
export class DevicePaused implements DomainEvent {
  readonly type = 'DevicePaused';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que se reanudó el cronómetro.
 * Timer reacciona: retoma la UI.
 */
export class DeviceResumed implements DomainEvent {
  readonly type = 'DeviceResumed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que se canceló la resolución.
 * Timer reacciona: reset UI, no guarda nada.
 */
export class DeviceCancelled implements DomainEvent {
  readonly type = 'DeviceCancelled';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Device notifica que la inspección expiró (+2s de gracia).
 * Timer reacciona: guarda solve con DNF.
 *
 * @param fromInspection - Si el DNF fue causado por inspección expirada.
 *   Cuando fromInspection=true, el penalty NO es editable después.
 */
export class DeviceDNF implements DomainEvent {
  readonly type = 'DeviceDNF';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly fromInspection: boolean,
  ) {}
}

/**
 * Device notifica que se aplicó un penalty.
 * Timer reacciona: marca el penalty en el solve actual.
 *
 * Ejemplo: inspección pasa de 15s → P2.
 */
export class DevicePenaltyApplied implements DomainEvent {
  readonly type = 'DevicePenaltyApplied';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly penalty: Penalty,
  ) {}
}

/**
 * Device notifica que se completó un paso intermedio (multi-step).
 * Timer reacciona: registra el step.
 */
export class DeviceStepCompleted implements DomainEvent {
  readonly type = 'DeviceStepCompleted';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly deviceId: string,
    public readonly stepTime: number,
    public readonly stepNumber: number,
  ) {}
}

/**
 * Se solicita un nuevo scramble.
 * Puede venir de un device (stackmat reset), de la UI, o del Timer mismo (post-stop).
 */
export class ScrambleRequested implements DomainEvent {
  readonly type = 'ScrambleRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly source: string) {}
}
```

## Timer Output Events (Timer → UI/Sistema)

Eventos que el Timer emite después de procesar. La UI y otros sistemas los consumen.

```ts
/**
 * El Timer cambió de estado visual.
 * UI reacciona: actualiza lo que se muestra.
 */
export class TimerStateChanged implements DomainEvent {
  readonly type = 'TimerStateChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly previousState: TimerState,
    public readonly newState: TimerState,
  ) {}
}

/**
 * Se generó un nuevo scramble.
 * UI reacciona: muestra el nuevo scramble e imagen.
 */
export class ScrambleGenerated implements DomainEvent {
  readonly type = 'ScrambleGenerated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly scramble: string) {}
}

/**
 * Se alcanzó un nuevo récord.
 * UI reacciona: confetti, notificación.
 */
export class NewRecord implements DomainEvent {
  readonly type = 'NewRecord';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly records: Array<{
      name: string;
      previous: number;
      current: number;
    }>,
  ) {}
}

/**
 * Se debe mostrar una celebración.
 */
export class CelebrationTriggered implements DomainEvent {
  readonly type = 'CelebrationTriggered';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(
    public readonly records: Array<{
      name: string;
      previous: number;
      current: number;
    }>,
  ) {}
}

// SolveAdded, SolveUpdated, SolvesRemoved ya existen en SolveEvents.ts
```

## Canal de tiempo (alta frecuencia)

El tiempo del cronómetro y el countdown de inspección NO pasan por el EventBus.
Se usa un callback directo que el Timer provee al device al momento del binding.

```ts
/**
 * Canal de alta frecuencia para actualizaciones de tiempo.
 * El device llama a este callback ~100 veces/segundo.
 * El Timer lo conecta internamente al store reactivo de la UI.
 */
type TimeUpdateCallback = (time: number) => void;
```

## Session Events

```ts
/**
 * Se seleccionó una nueva sesión.
 * Timer reacciona: carga solves, recalcula stats, ajusta scramble, cambia device si es necesario.
 */
export class SessionSwitched implements DomainEvent {
  readonly type = 'SessionSwitched';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(
    public readonly previousSession: Session | null,
    public readonly newSession: Session,
  ) {}
}

/**
 * Se aplicaron cambios a los settings de la sesión activa.
 * Timer reacciona: propaga a device si es necesario (e.g., inspection on/off).
 */
export class ActiveSessionSettingsChanged implements DomainEvent {
  readonly type = 'ActiveSessionSettingsChanged';
  readonly timestamp = Date.now();
  readonly aggregate = 'Session';

  constructor(
    public readonly session: Session,
    public readonly changedKeys: string[],
  ) {}
}
```

## Solve Events

```ts
// Ya definidos en SolveEvents.ts, se reutilizan:
// - SolveAdded (post-timer, ya cubierto)
// - SolveUpdated (edición de penalty/comments)
// - SolvesRemoved (eliminación)

/**
 * Se solicita cambiar el penalty de un solve.
 * Timer valida las reglas de edición antes de aplicar.
 */
export class SolvePenaltyChangeRequested implements DomainEvent {
  readonly type = 'SolvePenaltyChangeRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solve: Solve,
    public readonly newPenalty: Penalty,
  ) {}
}

/**
 * Se solicita eliminar solves.
 * Requiere confirmación del usuario antes de procesar.
 */
export class SolveRemovalRequested implements DomainEvent {
  readonly type = 'SolveRemovalRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solves: Solve[],
  ) {}
}

/**
 * Se confirmó la eliminación de solves.
 * Timer procesa: elimina de DB, recalcula stats.
 */
export class SolveRemovalConfirmed implements DomainEvent {
  readonly type = 'SolveRemovalConfirmed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(
    public readonly solves: Solve[],
  ) {}
}
```
