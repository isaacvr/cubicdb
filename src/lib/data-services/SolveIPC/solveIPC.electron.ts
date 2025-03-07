import type { IPC, Solve } from "@interfaces";
import type { SolveIPC } from "./solveIPC.interface";
import { clone } from "@helpers/object";

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
    return this.ipc.addSolve(clone(s));
  }

  addSolves(s: Solve[]) {
    return this.ipc.addSolves(clone(s));
  }

  updateSolve(s: Solve) {
    return this.ipc.updateSolve(clone(s));
  }

  removeSolves(s: Solve[]) {
    return this.ipc.removeSolves(clone(s));
  }
}
