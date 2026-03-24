import { TimerState as TimerStateEnum, Penalty } from '@interfaces';
import type { IEventBus, EventSubscription } from '$lib/events/types';
import type { TimerState } from './TimerState.svelte';
import {
  DeviceEnteredPrevention,
  DeviceReady,
  DeviceGreenLight,
  DeviceStartedInspection,
  DeviceStartedRunning,
  DeviceStopped,
  DevicePaused,
  DeviceResumed,
  DeviceCancelled,
  DeviceDNF,
  DevicePenaltyApplied,
  DeviceStepCompleted,
} from '$lib/events/domain/TimerEvents';

/**
 * Reactor del Timer.
 * Se suscribe a eventos del EventBus y actualiza el TimerState ($state).
 *
 * Fase 0: solo actualiza estado reactivo. Sin side effects
 * (no guarda solves, no genera scrambles, no calcula stats).
 * Los side effects se añaden en fases posteriores.
 */
export class TimerReactor {
  private subscriptions: EventSubscription[] = [];

  constructor(
    private eventBus: IEventBus,
    private state: TimerState,
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // === Flujo del solve ===

    this.sub(DeviceEnteredPrevention, () => {
      this.state.timerState = TimerStateEnum.PREVENTION;
      this.state.time = 0;
      this.state.decimals = true;
      this.state.ready = false;
    });

    this.sub(DeviceReady, () => {
      // La prevención terminó. Se prepara el solve.
      // TODO (Fase 1): crear lastSolve aquí.
    });

    this.sub(DeviceGreenLight, () => {
      this.state.ready = true;
    });

    this.sub(DeviceStartedInspection, () => {
      this.state.timerState = TimerStateEnum.INSPECTION;
      this.state.decimals = false;
    });

    this.sub(DeviceStartedRunning, () => {
      this.state.timerState = TimerStateEnum.RUNNING;
      this.state.decimals = true;
      this.state.ready = false;
    });

    this.sub(DeviceStopped, (e) => {
      this.state.timerState = TimerStateEnum.STOPPED;
      this.state.time = e.time;

      if (e.steps) {
        this.state.steps = e.steps;
      }

      // TODO (Fase 1): guardar solve, calcular stats, generar scramble.
    });

    this.sub(DevicePaused, () => {
      this.state.timerState = TimerStateEnum.PAUSE;
    });

    this.sub(DeviceResumed, () => {
      this.state.timerState = TimerStateEnum.RUNNING;
    });

    this.sub(DeviceCancelled, () => {
      this.state.reset();
    });

    // === Penalties ===

    this.sub(DevicePenaltyApplied, (e) => {
      if (this.state.lastSolve) {
        this.state.lastSolve = {
          ...this.state.lastSolve,
          penalty: e.penalty,
        };
      }
    });

    this.sub(DeviceDNF, (e) => {
      this.state.dnfFromInspection = e.fromInspection;
      if (this.state.lastSolve) {
        this.state.lastSolve = {
          ...this.state.lastSolve,
          penalty: Penalty.DNF,
        };
      }
      // TODO (Fase 1): guardar solve con DNF.
    });

    // === Multi-step ===

    this.sub(DeviceStepCompleted, (e) => {
      this.state.steps = [...this.state.steps, e.stepTime];
    });
  }

  /**
   * Atajo para suscribirse y guardar la referencia para cleanup.
   */
  private sub<T extends { type: string; timestamp: number }>(
    eventType: new (...args: any[]) => T,
    handler: (event: T) => void | Promise<void>,
  ) {
    this.subscriptions.push(this.eventBus.subscribe(eventType, handler));
  }

  /**
   * Limpia todas las suscripciones.
   * Llamar al desmontar el timer.
   */
  destroy() {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = [];
  }
}
