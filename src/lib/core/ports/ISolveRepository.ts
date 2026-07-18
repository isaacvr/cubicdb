import type { Solve } from "@domain/Solve";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";

export interface ISolveRepository {
  addSolve(solve: Solve): Promise<Solve>;
  getSolves(query?: SolveListQuery): Promise<Solve[]>;
  addSolves?(solves: Solve[]): Promise<Solve[]>;
  updateSolve?(solve: Solve): Promise<Solve>;
  removeSolves?(solves: Solve[]): Promise<Solve[]>;
  createEmptySolve(p?: Partial<Solve>): Solve;
}
