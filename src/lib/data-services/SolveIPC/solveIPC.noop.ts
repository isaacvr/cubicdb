import type { Solve } from "@interfaces";
import type { SolveIPC } from "./solveIPC.interface";

export class SolveNoopIPC implements SolveIPC {
  private constructor() {}

  private static _instance: SolveNoopIPC | null = null;

  static getInstance() {
    if (!SolveNoopIPC._instance) {
      SolveNoopIPC._instance = new SolveNoopIPC();
    }

    return SolveNoopIPC._instance;
  }

  async getSolves() {
    return [];
  }

  async addSolve(s: Solve) {
    return s;
  }

  async addSolves(s: Solve[]) {
    return s;
  }

  async updateSolve(s: Solve) {
    return s;
  }

  async removeSolves(s: Solve[]) {
    return s;
  }
}
