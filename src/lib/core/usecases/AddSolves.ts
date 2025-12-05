import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";

export class AddSolves {
  constructor(private solveRepo: ISolveRepository) {}

  async execute(solves: Solve[]): Promise<Solve[]> {
    if (!this.solveRepo.addSolves) throw new Error("addSolves not implemented by repository");
    const added = await this.solveRepo.addSolves(solves);
    return added;
  }
}
