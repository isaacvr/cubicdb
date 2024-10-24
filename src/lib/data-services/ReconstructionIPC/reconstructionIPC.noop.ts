import type { IDBReconstruction } from "@interfaces";
import type { ReconstructionIPC } from "./reconstructionIPC.interface";

export class ReconstructionNoopIPC implements ReconstructionIPC {
  private constructor() { }
  
  private static _instance: ReconstructionNoopIPC | null = null;

  static getInstance() {
    if (!ReconstructionNoopIPC._instance) {
      ReconstructionNoopIPC._instance = new ReconstructionNoopIPC();
    }

    return ReconstructionNoopIPC._instance;
  }

  async addReconstruction(r: IDBReconstruction) {
    return r;
  }

  async getReconstructions() {
    return [];
  }

  async reconstructionsVersion() {
    return { version: "0.0.0", minVersion: "0.0.0" };
  }

  async checkReconstructions() {
    return { version: "0.0.0", minVersion: "0.0.0" };
  }

  async updateReconstructions() {
    return true;
  }
}
