import type { Session, TimerState as TimerStateValue } from '@interfaces';
import type { TimerState } from './TimerState.svelte';

export interface TimerReadonlyView {
  readonly state: TimerStateValue;
  readonly session: Session | null;
  readonly scramble: string;
}

export function createTimerReadonlyView(state: TimerState): TimerReadonlyView {
  return {
    get state() {
      return state.timerState;
    },
    get session() {
      return state.session;
    },
    get scramble() {
      return state.scramble;
    },
  };
}
