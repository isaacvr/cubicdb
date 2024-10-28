import type { ICacheDB, IStorageInfo } from "@interfaces";
import type { CacheIPC } from "./cacheIPC.interface";

export class CacheNoopIPC implements CacheIPC {
  private constructor() {}

  private static _instance: CacheNoopIPC | null = null;

  static getInstance() {
    if (!CacheNoopIPC._instance) {
      CacheNoopIPC._instance = new CacheNoopIPC();
    }

    return CacheNoopIPC._instance;
  }

  async cacheCheckImage(hash: string): Promise<boolean> {
    return false;
  }

  async cacheGetImage(hash: string): Promise<string> {
    return "";
  }

  async cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    return [];
  }

  async cacheSaveImage(hash: string, data: string): Promise<void> {}

  async cacheGetVideo(hash: string): Promise<ArrayBuffer | null> {
    return null;
  }

  async cacheSaveVideo(hash: string, data: ArrayBuffer): Promise<void> {}

  async clearCache(db: ICacheDB) {}

  // TODO
  async getStorageInfo(): Promise<IStorageInfo> {
    let algorithms = 0;
    let cache = 0;
    let vcache = 0;
    let sessions = 0;
    let solves = 0;
    let tutorials = 0;
    let reconstructions = 0;

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
