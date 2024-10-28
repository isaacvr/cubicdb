import type { IDBReconstruction, IPC } from "@interfaces";
import type { ReconstructionIPC } from "./reconstructionIPC.interface";

export class ReconstructionElectronIPC implements ReconstructionIPC {
  ipc: IPC;
  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: ReconstructionElectronIPC | null = null;

  static getInstance() {
    if (!ReconstructionElectronIPC._instance) {
      ReconstructionElectronIPC._instance = new ReconstructionElectronIPC();
    }

    return ReconstructionElectronIPC._instance;
  }

  addReconstruction(r: IDBReconstruction) {
    return this.ipc.addReconstruction(r);
  }

  getReconstructions() {
    return this.ipc.getReconstructions();
  }

  reconstructionsVersion() {
    return this.ipc.reconstructionsVersion();
  }

  checkReconstructions() {
    return this.ipc.checkReconstructions();
  }

  updateReconstructions() {
    return this.ipc.updateReconstructions();
  }
}
