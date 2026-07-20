import { get } from 'svelte/store';
import { TimerState } from '@interfaces';
import type { TimerController } from '$lib/controllers/TimerController';

export function useKeyboardHandler(
  timerController: TimerController,
  keyboardEnabled: any,
  options?: { battle?: boolean }
) {
  const { timerState } = timerController;

  function isTextEditingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
    );
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!get(keyboardEnabled)) return;
    if (isTextEditingTarget(e.target)) return;

    const state = get(timerState);

    if (!options?.battle && (state === TimerState.CLEAN || state === TimerState.STOPPED)) {
      if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        timerController.nextTab();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        timerController.prevTab();
      }
    }
  }

  return {
    handleKeydown,
  };
}
