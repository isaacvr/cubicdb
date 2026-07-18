import { get } from 'svelte/store';
import { SolveController, solveController } from '$lib/controllers/SolveController';
import type { Solve } from '@interfaces';
import type { SolvePersistencePort } from './SolvePersistenceService';

export class SolveControllerPersistencePort implements SolvePersistencePort {
  constructor(private readonly controller: SolveController = solveController) {}

  async loadSolves(): Promise<Solve[]> {
    return this.controller.loadSolves();
  }

  async addSolve(solve: Partial<Solve>): Promise<Solve> {
    return this.controller.addSolve(this.controller.createSolve(solve));
  }

  async updateSolve(solve: Solve): Promise<{ previousSolve: Solve; solve: Solve }> {
    const previousSolve = get(this.controller.solves).find(item => item._id === solve._id) ?? solve;
    const updatedSolve = await this.controller.updateSolve(solve);
    return { previousSolve, solve: updatedSolve };
  }

  async removeSolves(solves: Solve[]): Promise<Solve[]> {
    return this.controller.removeSolves(solves);
  }
}
