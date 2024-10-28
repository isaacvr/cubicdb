import type { IPC, Solve } from "@interfaces";
import type { SolveIPC } from "./solveIPC.interface";

export class SolveElectronIPC implements SolveIPC {
  ipc: IPC;

  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: SolveElectronIPC | null = null;

  static getInstance() {
    if (!SolveElectronIPC._instance) {
      SolveElectronIPC._instance = new SolveElectronIPC();
    }

    return SolveElectronIPC._instance;
  }

  getSolves() {
    return this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    return this.ipc.addSolve(s);
  }

  addSolves(s: Solve[]) {
    return this.ipc.addSolves(s);
  }

  updateSolve(s: Solve) {
    return this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    return this.ipc.removeSolves(s);
  }
}
