import type { Algorithm } from "@interfaces";

/**
 * Port for Algorithm repository operations
 * Implement this interface in adapters (IndexedDB, Electron, etc)
 */
export interface IAlgorithmRepository {
  getAlgorithms(path: string, all?: boolean): Promise<Algorithm[]>;
  getAlgorithm(path: string, shortName: string): Promise<Algorithm | null>;
  addAlgorithm(algorithm: Algorithm): Promise<Algorithm>;
  updateAlgorithm(algorithm: Algorithm): Promise<Algorithm>;
  removeAlgorithm(algorithm: Algorithm): Promise<Algorithm>;
  removeAlgorithms?(algorithms: Algorithm[]): Promise<Algorithm[]>;
}
