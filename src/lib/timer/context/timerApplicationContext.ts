import { createContext } from 'svelte';
import type { TimerApplicationRuntime } from '../TimerApplicationRuntime';

export const [getTimerApplicationContext, setTimerApplicationContext] =
  createContext<TimerApplicationRuntime>();
