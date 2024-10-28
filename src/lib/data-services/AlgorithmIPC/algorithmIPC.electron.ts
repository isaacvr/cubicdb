import type { Algorithm, AlgorithmOptions, IPC } from "@interfaces";
import type { AlgorithmIPC } from "./algorithmIPC.interface";

export class AlgorithmElectronIPC implements AlgorithmIPC {
  ipc: IPC;

  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: AlgorithmElectronIPC | null = null;

  static getInstance() {
    if (!AlgorithmElectronIPC._instance) {
      AlgorithmElectronIPC._instance = new AlgorithmElectronIPC();
    }

    return AlgorithmElectronIPC._instance;
  }

  getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    return this.ipc.getAlgorithms(options);
  }

  getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    return this.ipc.getAlgorithm(options);
  }

  updateAlgorithm(alg: Algorithm) {
    let cp = { ...alg };

    delete cp._puzzle;

    return this.ipc.updateAlgorithm(cp);
  }

  addAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return this.ipc.addAlgorithm(cp);
  }

  removeAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return this.ipc.removeAlgorithm(cp);
  }

  algorithmsVersion() {
    return this.ipc.algorithmsVersion();
  }

  checkAlgorithms() {
    return this.ipc.checkAlgorithms();
  }

  updateAlgorithms() {
    return this.ipc.updateAlgorithms();
  }

  algorithmsStorage() {
    return this.ipc.algorithmsStorage();
  }
}
