import { get, writable, type Writable } from "svelte/store";
import { SolveRepositoryAdapter } from "../adapters/SolveRepositoryAdapter";
import { AddSolve } from "$lib/core/usecases/AddSolve";
import { AddSolves } from "$lib/core/usecases/AddSolves";
import { UpdateSolve } from "$lib/core/usecases/UpdateSolve";
import { RemoveSolves } from "$lib/core/usecases/RemoveSolves";
import { GetSolves } from "$lib/core/usecases/GetSolves";
import { CreateSolve } from "$lib/core/usecases/CreateSolve";
import type { Solve } from "@interfaces";

export class SolveController {
  public solves: Writable<Solve[]> = writable([]);

  private addSolveUsecase: AddSolve;
  private updateSolveUsecase: UpdateSolve;
  private removeSolvesUsecase: RemoveSolves;
  private addSolvesUsecase: AddSolves;
  private createSolveUsecase: CreateSolve;

  constructor() {
    const repo = new SolveRepositoryAdapter();
    this.addSolveUsecase = new AddSolve(repo);
    this.updateSolveUsecase = new UpdateSolve(repo);
    this.removeSolvesUsecase = new RemoveSolves(repo);
    this.addSolvesUsecase = new AddSolves(repo);
    this.createSolveUsecase = new CreateSolve(repo);
  }

  async loadSolves() {
    const repo = new SolveRepositoryAdapter();
    const getSolves = new GetSolves(repo);
    const s = await getSolves.execute();
    this.solves.set(s);
    return s;
  }

  async addSolve(solve: Solve) {
    const added = await this.addSolveUsecase.execute(solve);
    this.solves.update(curr => [added, ...curr]);
    return added;
  }

  async updateSolve(solve: Solve) {
    const previous = get(this.solves).find(item => item._id === solve._id) ?? solve;
    const updated = await this.updateSolveUsecase.execute(previous, solve);
    // update local store
    this.solves.update(curr => curr.map(s => (s._id === updated._id ? updated : s)));
    return updated;
  }

  async removeSolves(solvs: Solve[]) {
    const removed = await this.removeSolvesUsecase.execute(solvs);
    const removedIds = new Set(removed.map(r => r._id));
    this.solves.update(curr => curr.filter(s => !removedIds.has(s._id)));
    return removed;
  }

  async addSolves(solves: Solve[]) {
    const added = await this.addSolvesUsecase.execute(solves);
    this.solves.update(curr => [...added, ...curr]);
    return added;
  }

  createSolve(partial?: Partial<Solve>): Solve {
    return this.createSolveUsecase.execute(partial);
  }
}

export const solveController = new SolveController();
