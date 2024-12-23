import type { Algorithm, AlgorithmOptions } from "@interfaces";

export interface AlgorithmIPC {
  getAlgorithms: (options: AlgorithmOptions) => Promise<Algorithm[]>;
  getAlgorithm: (options: AlgorithmOptions) => Promise<Algorithm | null>;
  updateAlgorithm: (alg: Algorithm) => Promise<Algorithm>;
  addAlgorithm: (alg: Algorithm) => Promise<Algorithm>;
  removeAlgorithm: (alg: Algorithm) => Promise<boolean>;
  algorithmsVersion: () => Promise<{ version: string; minVersion: string }>;
  checkAlgorithms: () => Promise<{ version: string; minVersion: string }>;
  updateAlgorithms: () => Promise<boolean>;
}
