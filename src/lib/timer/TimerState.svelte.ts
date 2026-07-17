import {
  Penalty,
  TimerState as TimerStateEnum,
  type Solve,
  type Session,
  type Statistics,
} from '@interfaces';
import type { ScrambleProbability } from '$lib/events/timer/ScrambleEventTypes';

/**
 * Estado reactivo del Timer.
 * Subordinado a los eventos: el TimerReactor actualiza estas propiedades.
 * La UI lee directamente de esta clase (reactivo via $state).
 *
 * IMPORTANTE: pasar siempre el objeto completo, nunca propiedades individuales.
 * Los componentes acceden a `state.time`, no a `time` directamente.
 */
export class TimerState {
  timerState: TimerStateEnum = $state(TimerStateEnum.CLEAN);
  time: number = $state(0);
  ready: boolean = $state(false);
  decimals: boolean = $state(true);
  scramble: string = $state('');
  scrambleRequestId: string | null = $state(null);
  scrambleMode: string = $state('');
  scrambleLength: number = $state(0);
  scrambleProbability: ScrambleProbability = $state(-1);
  lastSolve: Solve | null = $state(null);
  session: Session | null = $state(null);
  solves: Solve[] = $state([]);
  allSolves: Solve[] = $state([]);
  steps: number[] = $state([]);
  statistics: Statistics | null = $state(null);
  activeDeviceId: string | null = $state(null);
  penalty: Penalty = $state(Penalty.NONE);

  /** Indica si el DNF del último solve fue por inspección (no editable) */
  dnfFromInspection: boolean = $state(false);

  /**
   * Resetea todo al estado inicial (CLEAN).
   */
  reset() {
    this.timerState = TimerStateEnum.CLEAN;
    this.time = 0;
    this.ready = false;
    this.decimals = true;
    this.lastSolve = null;
    this.steps = [];
    this.penalty = Penalty.NONE;
    this.dnfFromInspection = false;
  }
}
