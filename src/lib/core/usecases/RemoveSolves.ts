import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";

export class RemoveSolves {
  constructor(private solveRepo: ISolveRepository) {}

  async execute(solves: Solve[]): Promise<Solve[]> {
    if (!this.solveRepo.removeSolves) throw new Error("removeSolves not implemented by repository");
    const removed = await this.solveRepo.removeSolves(solves);
    return removed;
  }
}
