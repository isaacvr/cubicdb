import type { Solve } from "@interfaces";

export interface SolveIPC {
  getSolves: () => Promise<Solve[]>;
  addSolve: (s: Solve) => Promise<Solve>;
  addSolves: (s: Solve[]) => Promise<Solve[]>;
  updateSolve: (s: Solve) => Promise<Solve>;
  removeSolves: (s: Solve[]) => Promise<Solve[]>;
}
