import type { ISolveRepository } from "../ports/ISolveRepository";
import type { Solve } from "@interfaces";

export class CreateSolve {
  constructor(private solveRepo: ISolveRepository) {}

  execute(partial?: Partial<Solve>): Solve {
    return this.solveRepo.createEmptySolve(partial);
  }
}
