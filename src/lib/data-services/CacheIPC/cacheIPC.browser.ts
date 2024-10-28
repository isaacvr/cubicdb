import type { ICacheDB, IStorageInfo, Session } from "@interfaces";
import type { CacheIPC } from "./cacheIPC.interface";
import { openDB, type IDBPDatabase } from "idb";
import { getByteSize } from "@helpers/object";

const DBName = "CubicDB-data";
const SessionStore = "Sessions";
const SolveStore = "Solves";
const CacheStore = "Cache";
const dbVersion = 1;
const debug = false;

interface ICacheImg {
  hash: string;
  img: string;
}

interface DATABASE {}

export class CacheBrowserIPC implements CacheIPC {
  DB: IDBPDatabase<DATABASE> | null;
  private cache: Map<string, string>;
  private vCache: Map<string, ArrayBuffer>;
  private initialized = false;
  private isInit = false;

  private constructor() {
    this.cache = new Map();
    this.vCache = new Map();
    this.DB = null;
    this.init();
  }

  private static _instance: CacheBrowserIPC | null = null;

  static getInstance() {
    if (!CacheBrowserIPC._instance) {
      CacheBrowserIPC._instance = new CacheBrowserIPC();
    }

    return CacheBrowserIPC._instance;
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

    try {
      this.DB = await openDB(DBName, dbVersion, {
        upgrade: async db => {
          // Solves
          !db.objectStoreNames.contains(SolveStore) &&
            db.createObjectStore(SolveStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", SolveStore);

          // Cache
          !db.objectStoreNames.contains(CacheStore) &&
            db.createObjectStore(CacheStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", CacheStore);

          // Sessions
          !db.objectStoreNames.contains(SessionStore) &&
            db.createObjectStore(SessionStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", SessionStore);
        },
      });

      // Load Cache to RAM
      this.cache.clear();
      let allRecords: ICacheImg[] = await this.DB.getAll(CacheStore);

      for (let i = 0, maxi = allRecords.length; i < maxi; i += 1) {
        let { hash, img } = allRecords[i];
        this.cache.set(hash, img);
      }

      debug && console.log(`Loaded ${allRecords.length} records from cache`);
    } catch (err) {
      console.log("ERROR: ", err);
    }

    this.initialized = true;
    this.isInit = false;
  }

  async cacheCheckImage(hash: string): Promise<boolean> {
    await this.init();
    return this.cache.has(hash);
  }

  async cacheGetImage(hash: string): Promise<string> {
    await this.init();
    return this.cache.get(hash) || "";
  }

  async cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    await this.init();
    return hashes.map(h => this.cache.get(h) || "");
  }

  async cacheSaveImage(hash: string, data: string): Promise<void> {
    await this.init();
    if (!this.DB) return;

    const tx = this.DB.transaction(CacheStore, "readwrite");
    await Promise.all([tx.store.put(<ICacheImg>{ hash, img: data }), tx.done]);
    this.cache.set(hash, data);
  }

  async cacheSave(hash: string, data: string): Promise<void> {}

  async cacheGetVideo(hash: string) {
    return null;
  }

  async cacheSaveVideo(hash: string, data: ArrayBuffer) {}

  async clearCache(db: ICacheDB) {
    await this.init();
    if (!this.DB) return;

    if (db === "Algorithms" || db === "Tutorials") return;

    const store = db === "Cache" ? CacheStore : db === "Sessions" ? SessionStore : SolveStore;

    const allCache = await this.DB.getAll(store);
    const tx = this.DB.transaction(store, "readwrite");
    await Promise.all([...allCache.map(c => tx.store.delete(c._id)), tx.done]);
  }

  // TODO
  async getStorageInfo(): Promise<IStorageInfo> {
    await this.init();
    if (!this.DB)
      return {
        algorithms: 0,
        cache: 0,
        sessions: 0,
        solves: 0,
        tutorials: 0,
        vcache: 0,
        reconstructions: 0,
      };

    let cache = await this.DB.getAll(CacheStore);
    let sessions = await this.DB.getAll(SessionStore);
    let solves = await this.DB.getAll(SolveStore);

    return {
      algorithms: 0,
      cache: getByteSize(cache),
      vcache: 0,
      sessions: getByteSize(sessions),
      solves: getByteSize(solves),
      tutorials: 0,
      reconstructions: 0,
    };
  }
}
