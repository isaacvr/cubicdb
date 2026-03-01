import type { ISolveRepository } from "../ports/ISolveRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Solve } from "@interfaces";
import { SolveUpdated } from "@events/domain";

/**
 * Use case: Update an existing solve
 * Emits: SolveUpdated event after persisting
 */
export class UpdateSolve {
  constructor(
    private solveRepo: ISolveRepository,
    private dispatcher: IEventDispatcher
  ) {}

  async execute(previousSolve: Solve, updatedSolve: Solve): Promise<Solve> {
    if (!this.solveRepo.updateSolve) throw new Error("updateSolve not implemented by repository");
    const result = await this.solveRepo.updateSolve(updatedSolve);
    await this.dispatcher.dispatch(new SolveUpdated(previousSolve, result));
    return result;
  }
}
