import type { ICacheDB, IPC, IStorageInfo } from "@interfaces";
import type { CacheIPC } from "./cacheIPC.interface";

export class CacheElectronIPC implements CacheIPC {
  private cache: Map<string, string>;
  private vCache: Map<string, ArrayBuffer>;
  ipc: IPC;

  private constructor() {
    this.cache = new Map();
    this.vCache = new Map();
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: CacheElectronIPC | null = null;

  static getInstance() {
    if (!CacheElectronIPC._instance) {
      CacheElectronIPC._instance = new CacheElectronIPC();
    }

    return CacheElectronIPC._instance;
  }

  cacheCheckImage(hash: string): Promise<boolean> {
    return this.ipc.cacheCheckImage(hash);
  }

  cacheGetImage(hash: string): Promise<string> {
    return Promise.resolve(this.cache.get(hash) || "");
  }

  cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    return Promise.resolve(hashes.map(h => this.cache.get(h) || ""));
  }

  cacheSaveImage(hash: string, data: string): Promise<void> {
    this.cache.set(hash, data);
    return this.ipc.cacheSaveImage(hash, data);
  }

  cacheGetVideo(hash: string): Promise<ArrayBuffer | null> {
    return Promise.resolve(this.vCache.get(hash) || null);
  }

  cacheSaveVideo(hash: string, data: ArrayBuffer): Promise<void> {
    this.vCache.set(hash, data);
    return this.ipc.cacheSaveVideo(hash, data);
  }

  clearCache(db: ICacheDB) {
    switch (db) {
      case "Cache": {
        this.cache.clear();
        return this.ipc.clearCache(db);
      }
      case "VCache": {
        this.vCache.clear();
        return this.ipc.clearCache(db);
      }
      case "Solves":
      case "Sessions": {
        return this.ipc.clearCache(db);
      }
    }

    return Promise.resolve();
  }

  async getStorageInfo(): Promise<IStorageInfo> {
    let algorithms = await this.ipc.algorithmsStorage();
    let cache = await this.ipc.cacheStorage();
    let vcache = await this.ipc.vCacheStorage();
    let sessions = await this.ipc.sessionsStorage();
    let solves = await this.ipc.solvesStorage();
    let tutorials = await this.ipc.tutorialsStorage();
    let reconstructions = await this.ipc.reconstructionsStorage();

    return {
      algorithms,
      cache,
      vcache,
      sessions,
      solves,
      tutorials,
      reconstructions,
    };
  }
}
