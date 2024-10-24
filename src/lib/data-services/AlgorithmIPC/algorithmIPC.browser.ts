import type { Algorithm, AlgorithmOptions } from "@interfaces";
import type { AlgorithmIPC } from "./algorithmIPC.interface";
import { type IDBPDatabase } from "idb";
import { parseDB } from "@helpers/strings";
import { clone } from "@helpers/object";

interface DATABASE {}

let algs: Algorithm[] = [];

async function loadData() {
  const _algs = await import("$lib/fixed/algs.db?raw");
  algs = parseDB(_algs.default || "");
}

export class AlgorithmBrowserIPC implements AlgorithmIPC {
  DB: IDBPDatabase<DATABASE> | null;
  private initialized = false;
  private isInit = false;

  private constructor() {
    this.DB = null;
    this.init();
  }

  private static _instance: AlgorithmBrowserIPC | null = null;

  static getInstance() {
    if (!AlgorithmBrowserIPC._instance) {
      AlgorithmBrowserIPC._instance = new AlgorithmBrowserIPC();
    }

    return AlgorithmBrowserIPC._instance;
  }

  private async init() {
    if (this.initialized) return;
    if (!this.isInit) {
      this.isInit = true;
    } else {
      await new Promise(res => {
        let itv = setInterval(() => {
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

  async getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    await this.init();
    if (options.all) return clone(algs) as Algorithm[];
    let fAlgs = algs.filter(a => a.parentPath === options.path) as Algorithm[];
    return clone(fAlgs);
  }

  async getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    await this.init();
    let fAlgs = algs.filter(
      a => a.parentPath === options.path && a.shortName === options.shortName
    ) as Algorithm[];
    return fAlgs.length === 0 ? null : clone(fAlgs[0]);
  }

  updateAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }

  addAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }

  removeAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }

  algorithmsVersion() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  checkAlgorithms() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  updateAlgorithms() {
    return Promise.resolve(false);
  }

  async algorithmsStorage() {
    return 0;
  }
}
