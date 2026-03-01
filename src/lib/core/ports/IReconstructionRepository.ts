import type { IDBReconstruction } from "@interfaces";

/**
 * Port for Reconstruction repository operations
 * Implement this interface in adapters (IndexedDB, Electron, etc)
 */
export interface IReconstructionRepository {
  getReconstructions(path: string): Promise<IDBReconstruction[]>;
  getReconstruction(path: string, shortName: string): Promise<IDBReconstruction | null>;
  addReconstruction(reconstruction: IDBReconstruction): Promise<IDBReconstruction>;
  updateReconstruction(reconstruction: IDBReconstruction): Promise<IDBReconstruction>;
  removeReconstruction(reconstruction: IDBReconstruction): Promise<IDBReconstruction>;
  removeReconstructions?(reconstructions: IDBReconstruction[]): Promise<IDBReconstruction[]>;
}
