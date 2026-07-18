import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";

export class GetSolves {
  constructor(private solveRepo: ISolveRepository) {}

  async execute(query?: SolveListQuery): Promise<Solve[]> {
    const solves = await this.solveRepo.getSolves(query);
    // any domain-level filtering/ordering can be placed here
    return solves;
  }
}
