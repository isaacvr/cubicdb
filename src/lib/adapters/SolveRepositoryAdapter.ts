import { get } from "svelte/store";
import { dataService } from "$lib/data-services/data.service";
import type { ISolveRepository } from "../core/ports/ISolveRepository";
import { Penalty, type Solve } from "@interfaces";

export class SolveRepositoryAdapter implements ISolveRepository {
  async addSolve(solve: Solve): Promise<Solve> {
    const ds = get(dataService);
    return ds.solve.addSolve(solve);
  }

  async getSolves(): Promise<Solve[]> {
    const ds = get(dataService);
    return ds.solve.getSolves();
  }

  async updateSolve(solve: Solve): Promise<Solve> {
    const ds = get(dataService);
    return ds.solve.updateSolve(solve);
  }

  async removeSolves(solves: Solve[]): Promise<Solve[]> {
    const ds = get(dataService);
    return ds.solve.removeSolves(solves as any);
  }

  async addSolves(solves: Solve[]): Promise<Solve[]> {
    const ds = get(dataService);
    return ds.solve.addSolves(solves as any);
  }

  createEmptySolve(s?: Partial<Solve>): Solve {
    return {
      date: Date.now(),
      time: 0,
      scramble: "",
      penalty: Penalty.NONE,
      selected: false,
      session: "",
      ...(s || {}),
    };
  }
}
