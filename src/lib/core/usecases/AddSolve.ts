import type { ISolveRepository } from "@ports/ISolveRepository";
import type { IEventDispatcher } from "@ports/IEventDispatcher";
import { Solve } from "@domain/Solve";
import { SolveAdded } from "@events/domain";

/**
 * Use case: Add a new solve to a session
 * Emits: SolveAdded event after persisting
 */
export class AddSolve {
  constructor(
    private solveRepo: ISolveRepository,
    private dispatcher?: IEventDispatcher
  ) {}

  async execute(solve: Partial<Solve>): Promise<Solve> {
    const added = await this.solveRepo.addSolve(new Solve(solve));
    await this.dispatcher?.dispatch(new SolveAdded(added));
    return added;
  }
}
