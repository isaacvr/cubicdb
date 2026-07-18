import type { Solve } from "@interfaces";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";

export interface SolveIPC {
  getSolves: (query?: SolveListQuery) => Promise<Solve[]>;
  addSolve: (s: Solve) => Promise<Solve>;
  addSolves: (s: Solve[]) => Promise<Solve[]>;
  updateSolve: (s: Solve) => Promise<Solve>;
  removeSolves: (s: Solve[]) => Promise<Solve[]>;
}
