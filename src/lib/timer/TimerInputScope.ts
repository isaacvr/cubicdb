import { TimerState } from "@interfaces";

export const TIMER_TAB_INDEX = 0;

export function isTimerInputTab(tab: number): boolean {
  return tab === TIMER_TAB_INDEX;
}

export function shouldProcessTimerKeyboardInput(tab: number): boolean {
  return isTimerInputTab(tab);
}

export function shouldCancelTimerInputOnTabChange(
  previousTab: number,
  nextTab: number,
  timerState: TimerState
): boolean {
  if (isTimerInputTab(nextTab)) return false;
  if (!isTimerInputTab(previousTab)) return false;

  return [
    TimerState.PREVENTION,
    TimerState.INSPECTION,
    TimerState.RUNNING,
    TimerState.PAUSE,
  ].includes(timerState);
}
