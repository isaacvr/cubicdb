import type { ICacheDB, IStorageInfo } from "@interfaces";

export interface CacheIPC {
  cacheCheckImage: (hash: string) => Promise<boolean>;
  cacheGetImage: (hash: string) => Promise<string>;
  cacheGetImageBundle: (hashes: string[]) => Promise<string[]>;
  cacheGetVideo: (hash: string) => Promise<ArrayBuffer | null>;
  cacheSaveImage: (hash: string, data: string) => Promise<void>;
  cacheSaveVideo: (hash: string, data: ArrayBuffer) => Promise<void>;
  clearCache: (db: ICacheDB) => Promise<void>;
  getStorageInfo: () => Promise<IStorageInfo>;
}
