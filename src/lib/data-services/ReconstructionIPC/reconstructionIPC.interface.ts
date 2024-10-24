import type { IDBReconstruction } from "@interfaces";

interface VersionInfo {
  version: string;
  minVersion: string;
}

export interface ReconstructionIPC {
  addReconstruction: (r: IDBReconstruction) => Promise<IDBReconstruction>;
  getReconstructions: () => Promise<IDBReconstruction[]>;
  updateReconstructions: () => Promise<boolean>;
  reconstructionsVersion: () => Promise<VersionInfo>;
  checkReconstructions: () => Promise<VersionInfo>;
}
