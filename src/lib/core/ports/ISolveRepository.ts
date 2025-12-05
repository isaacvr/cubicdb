import type { Solve } from "@interfaces";

export interface ISolveRepository {
  addSolve(solve: Solve): Promise<Solve>;
  getSolves(): Promise<Solve[]>;
  addSolves?(solves: Solve[]): Promise<Solve[]>;
  updateSolve?(solve: Solve): Promise<Solve>;
  removeSolves?(solves: Solve[]): Promise<Solve[]>;
  createEmptySolve(p?: Partial<Solve>): Solve;
}
