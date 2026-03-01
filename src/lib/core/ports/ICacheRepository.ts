import type { ICacheDB } from "@interfaces";

/**
 * Port for Cache repository operations
 * Implement this interface in adapters (IndexedDB, Electron, etc)
 */
export interface ICacheRepository {
  get(key: string): Promise<any | null>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAll(cacheType: ICacheDB): Promise<any[]>;
  cache(data: ICacheDB): Promise<void>;
}
