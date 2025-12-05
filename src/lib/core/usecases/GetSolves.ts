import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";

export class GetSolves {
  constructor(private solveRepo: ISolveRepository) {}

  async execute(): Promise<Solve[]> {
    const solves = await this.solveRepo.getSolves();
    // any domain-level filtering/ordering can be placed here
    return solves;
  }
}
