import type { Algorithm, AlgorithmOptions } from "@interfaces";
import type { AlgorithmIPC } from "./algorithmIPC.interface";

export class AlgorithmNoopIPC implements AlgorithmIPC {
  private constructor() {}

  private static _instance: AlgorithmNoopIPC | null = null;

  static getInstance() {
    if (!AlgorithmNoopIPC._instance) {
      AlgorithmNoopIPC._instance = new AlgorithmNoopIPC();
    }

    return AlgorithmNoopIPC._instance;
  }

  async getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    return [];
    // return this.ipc.getAlgorithms(options);
  }

  async getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    return null;
    // return this.ipc.getAlgorithm(options);
  }

  async updateAlgorithm(alg: Algorithm) {
    let cp = { ...alg };

    delete cp._puzzle;

    return alg;

    // return this.ipc.updateAlgorithm(cp);
  }

  async addAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return alg;
    // return this.ipc.addAlgorithm(cp);
  }

  async removeAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return false;
    // return this.ipc.removeAlgorithm(cp);
  }

  async algorithmsVersion() {
    // return this.ipc.algorithmsVersion();
    return {
      version: "0.0.0",
      minVersion: "0.0.0",
    };
  }

  async checkAlgorithms() {
    // return this.ipc.checkAlgorithms();
    return {
      version: "0.0.0",
      minVersion: "0.0.0",
    };
  }

  async updateAlgorithms() {
    // return this.ipc.updateAlgorithms();
    return true;
  }

  async algorithmsStorage() {
    // return this.ipc.algorithmsStorage();
    return 0;
  }
}
