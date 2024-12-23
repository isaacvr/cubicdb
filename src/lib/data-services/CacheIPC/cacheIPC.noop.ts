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
    const algorithms = 0;
    const cache = 0;
    const vcache = 0;
    const sessions = 0;
    const solves = 0;
    const tutorials = 0;
    const reconstructions = 0;

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
