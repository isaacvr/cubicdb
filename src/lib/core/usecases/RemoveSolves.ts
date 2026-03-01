import type { ISolveRepository } from "../ports/ISolveRepository";
import type { IEventDispatcher } from "../ports/IEventDispatcher";
import type { Solve } from "@interfaces";
import { SolvesRemoved } from "@events/domain";

/**
 * Use case: Remove multiple solves
 * Emits: SolvesRemoved event after persisting
 */
export class RemoveSolves {
  constructor(
    private solveRepo: ISolveRepository,
    private dispatcher: IEventDispatcher
  ) {}

  async execute(solves: Solve[]): Promise<Solve[]> {
    if (!this.solveRepo.removeSolves) throw new Error("removeSolves not implemented by repository");
    const removed = await this.solveRepo.removeSolves(solves);
    await this.dispatcher.dispatch(new SolvesRemoved(removed));
    return removed;
  }
}
