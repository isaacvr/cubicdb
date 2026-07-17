import { createContext } from 'svelte';
import type { TimerController } from '$lib/controllers/TimerController';
import type { Solve, Session } from '@interfaces';
import type { Writable } from 'svelte/store';
import type { ScrambleRequestSource } from '$lib/events/timer/ScrambleEventTypes';
import type { NativeTimestampSource } from '$lib/events/timer/TimerEventFactory';

export interface TimerContextType {
  timerController: TimerController;
  selected: Writable<number>;
  enableKeyboard: Writable<boolean>;
  
  // Session management
  selectedSession: () => Promise<void>;
  newSession: (name: string, type: any, group: number, mode: number, steps: number, stepNames: string[]) => Promise<any>;
  handleUpdateSession: (session: Session) => void;
  
  // Filter management
  selectedGroup: (rescramble?: boolean, saveGroup?: boolean) => void;
  selectedMode: (rescramble?: boolean, saveMode?: boolean, updateProb?: boolean) => Promise<void>;
  selectedFilter: (rescramble?: boolean, saveFilter?: boolean) => Promise<void>;
  
  // Solve management
  selectSolve: (s: Solve) => number;
  selectSolveById: (id: string, n: number) => number;
  updateStatistics: () => any;
  setSolves: (rescramble?: boolean) => boolean;
  handleUpdateSolve: (solve: Solve) => void;
  handleRemoveSolves: (solves: Solve[]) => void;
  
  // Other
  editSessions: () => void;
  editSolve: (s: Solve) => void;
  initScrambler: (
    scr?: string,
    mode?: string,
    prob?: number | number[],
    nativeEvent?: NativeTimestampSource,
    source?: ScrambleRequestSource,
  ) => void;
}

export const [getTimerContext, setTimerContext] = createContext<TimerContextType>();
