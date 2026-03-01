import { get } from 'svelte/store';
import { TimerState } from '@interfaces';
import type { TimerController } from '$lib/controllers/TimerController';

export function useKeyboardHandler(
  timerController: TimerController,
  keyboardEnabled: any,
  options?: { battle?: boolean }
) {
  const { timerState } = timerController;

  function handleKeydown(e: KeyboardEvent) {
    if (!get(keyboardEnabled)) return;

    const state = get(timerState);

    if (
      !options?.battle &&
      (state === TimerState.CLEAN || state === TimerState.STOPPED)
    ) {
      if (e.key === 'ArrowRight') {
        timerController.nextTab();
      } else if (e.key === 'ArrowLeft') {
        timerController.prevTab();
      }
    }
  }

  return {
    handleKeydown,
  };
}
