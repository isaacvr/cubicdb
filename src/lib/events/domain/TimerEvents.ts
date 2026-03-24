import type { DomainEvent } from '../types';
import type { Penalty, Solve, Session } from '@interfaces';

// ============================================================
// Timer Input Events (Device → Timer)
// Notificaciones que los devices emiten. Son hechos consumados.
// ============================================================

/**
 * El device entró en estado de prevención.
 * El Timer muestra estado PREVENTION y resetea el tiempo a 0.
 */
export class DeviceEnteredPrevention implements DomainEvent {
  readonly type = 'DeviceEnteredPrevention';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * La prevención terminó.
 * Ocurre entre PREVENTION e INSPECTION (o RUNNING si no hay inspección).
 * El Timer prepara el solve (crea lastSolve).
 */
export class DeviceReady implements DomainEvent {
  readonly type = 'DeviceReady';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * El usuario está a punto de arrancar (green light).
 * Se emite justo antes de RUNNING:
 *   - Sin inspección: cuando el space sigue presionado después de READY.
 *   - Con inspección: cuando el usuario presiona space durante INSPECTION.
 * El Timer activa el flag ready=true.
 */
export class DeviceGreenLight implements DomainEvent {
  readonly type = 'DeviceGreenLight';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * La inspección comenzó.
 * El Timer muestra el countdown de inspección.
 */
export class DeviceStartedInspection implements DomainEvent {
  readonly type = 'DeviceStartedInspection';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * El cronómetro está corriendo.
 * El Timer muestra estado RUNNING y desactiva ready.
 * El tiempo real se recibe por canal directo (onTimeUpdate), no por EventBus.
 */
export class DeviceStartedRunning implements DomainEvent {
  readonly type = 'DeviceStartedRunning';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * El cronómetro se detuvo.
 * El Timer guarda el solve, calcula stats y genera un nuevo scramble.
 *
 * @param time - Tiempo final en milisegundos.
 * @param steps - Tiempos parciales para sesiones multi-step.
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
 * El cronómetro se pausó.
 * El Timer congela la UI.
 */
export class DevicePaused implements DomainEvent {
  readonly type = 'DevicePaused';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * El cronómetro se reanudó.
 * El Timer retoma la UI.
 */
export class DeviceResumed implements DomainEvent {
  readonly type = 'DeviceResumed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * Se canceló la resolución.
 * El Timer resetea a CLEAN, tiempo a 0, no guarda nada.
 */
export class DeviceCancelled implements DomainEvent {
  readonly type = 'DeviceCancelled';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly deviceId: string) {}
}

/**
 * DNF: la inspección expiró (+2s de gracia).
 * El Timer guarda el solve con DNF.
 *
 * @param fromInspection - Cuando es true, el penalty NO es editable después.
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
 * Se aplicó un penalty (inspección > 15s → P2).
 * El Timer marca el penalty en el solve actual.
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
 * Se completó un paso intermedio (multi-step).
 * El Timer registra el step.
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

// ============================================================
// Timer Output Events (Timer → UI/Sistema)
// ============================================================

/**
 * Se solicita un nuevo scramble.
 * Puede venir de la UI o del Timer (post-stop).
 */
export class ScrambleRequested implements DomainEvent {
  readonly type = 'ScrambleRequested';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly source: string) {}
}

/**
 * Se generó un nuevo scramble.
 * La UI muestra el nuevo scramble.
 */
export class ScrambleGenerated implements DomainEvent {
  readonly type = 'ScrambleGenerated';
  readonly timestamp = Date.now();
  readonly aggregate = 'Timer';

  constructor(public readonly scramble: string) {}
}

/**
 * Se alcanzó un nuevo récord.
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

/**
 * Error global. La UI se suscribe para mostrar notificaciones.
 */
export class ErrorOccurred implements DomainEvent {
  readonly type = 'ErrorOccurred';
  readonly timestamp = Date.now();

  constructor(
    public readonly error: { code: string; message: string },
    public readonly context?: string,
  ) {}
}

// ============================================================
// Session Events
// ============================================================

/**
 * Se seleccionó una nueva sesión.
 * El Timer carga solves, recalcula stats y ajusta scramble.
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
 * Se cambiaron los settings de la sesión activa.
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

// ============================================================
// Solve CRUD Events (UI → Timer)
// ============================================================

/**
 * Se solicita cambiar el penalty de un solve.
 * El Timer valida las reglas de edición antes de aplicar.
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

  constructor(public readonly solves: Solve[]) {}
}

/**
 * Se confirmó la eliminación de solves.
 * El Timer elimina de DB y recalcula stats.
 */
export class SolveRemovalConfirmed implements DomainEvent {
  readonly type = 'SolveRemovalConfirmed';
  readonly timestamp = Date.now();
  readonly aggregate = 'Solve';

  constructor(public readonly solves: Solve[]) {}
}
