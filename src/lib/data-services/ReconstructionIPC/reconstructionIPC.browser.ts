import type { IDBReconstruction } from "@interfaces";
import type { ReconstructionIPC } from "./reconstructionIPC.interface";
import { parseDB } from "@helpers/strings";

let recs: IDBReconstruction[] = [];

async function loadData() {
  const _recs = await import("$lib/fixed/reconstructions.db?raw");

  recs = parseDB(_recs.default || "");
}

export class ReconstructionBrowserIPC implements ReconstructionIPC {
  private initialized = false;
  private isInit = false;

  private constructor() {
    this.init();
  }

  private static _instance: ReconstructionBrowserIPC | null = null;

  static getInstance() {
    if (!ReconstructionBrowserIPC._instance) {
      ReconstructionBrowserIPC._instance = new ReconstructionBrowserIPC();
    }

    return ReconstructionBrowserIPC._instance;
  }

  private async init() {
    if (this.initialized) return;
    if (!this.isInit) {
      this.isInit = true;
    } else {
      await new Promise(res => {
        const itv = setInterval(() => {
          if (!this.isInit) {
            clearInterval(itv);
            res(null);
          }
        }, 50);
      });
      return;
    }

    await loadData();

    this.initialized = true;
    this.isInit = false;
  }

  async addReconstruction(r: IDBReconstruction) {
    return r;
  }

  async getReconstructions() {
    await this.init();
    return recs;
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
