import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";

export class UpdateSolve {
  constructor(private solveRepo: ISolveRepository) {}

  async execute(solve: Solve): Promise<Solve> {
    if (!this.solveRepo.updateSolve) throw new Error("updateSolve not implemented by repository");
    const updated = await this.solveRepo.updateSolve(solve);
    return updated;
  }
}
