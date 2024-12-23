import type { Solve } from "@interfaces";
import type { SolveIPC } from "./solveIPC.interface";
import { openDB, type IDBPDatabase } from "idb";
import { clone } from "@helpers/object";

const DBName = "CubicDB-data";
const SolveStore = "Solves";
const dbVersion = 1;
const debug = false;

interface DATABASE {}

export class SolveBrowserIPC implements SolveIPC {
  DB: IDBPDatabase<DATABASE> | null;
  private initialized = false;
  private isInit = false;

  private constructor() {
    this.DB = null;
  }

  private static _instance: SolveBrowserIPC | null = null;

  static getInstance() {
    if (!SolveBrowserIPC._instance) {
      SolveBrowserIPC._instance = new SolveBrowserIPC();
    }

    return SolveBrowserIPC._instance;
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

    try {
      this.DB = await openDB(DBName, dbVersion, {
        upgrade: async db => {
          // Solves
          !db.objectStoreNames.contains(SolveStore) &&
            db.createObjectStore(SolveStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", SolveStore);
        },
      });
    } catch (err) {
      console.log("ERROR: ", err);
    }

    this.initialized = true;
    this.isInit = false;
  }

  async getSolves() {
    await this.init();
    if (!this.DB) return [];
    return this.DB.getAll(SolveStore) as Promise<Solve[]>;
  }

  async addSolve(s: Solve) {
    await this.init();
    if (!this.DB) return s;

    const tx = this.DB.transaction(SolveStore, "readwrite");
    const sv = clone(s);
    delete sv._id;

    const res = await Promise.all([tx.store.put(sv), tx.done]);
    sv._id = res[0];
    return sv;
  }

  async addSolves(s: Solve[]) {
    await this.init();
    if (!this.DB) return s;

    const ss = s.map(sv => {
      const res: Solve = clone(sv);
      delete res._id;
      return res;
    });

    const tx = this.DB.transaction(SolveStore, "readwrite");

    const res = await Promise.all([...ss.map(sv => tx.store.put(sv)), tx.done]);

    res.pop();
    res.forEach((id, p) => (ss[p]._id = id));

    return ss;
  }

  async updateSolve(s: Solve) {
    await this.init();
    if (!this.DB) return s;

    const rs: Solve | undefined = await this.DB.get(SolveStore, s._id);

    if (rs) {
      rs.comments = s.comments;
      rs.penalty = s.penalty;
      rs.time = s.time;
      const tx = this.DB.transaction(SolveStore, "readwrite");
      await Promise.all([tx.store.put(rs), tx.done]);
      return rs;
    }

    return s;
  }

  async removeSolves(s: Solve[]): Promise<Solve[]> {
    await this.init();

    const res = s.map(s => clone(s));

    if (!this.DB) return res;

    const tx = this.DB.transaction(SolveStore, "readwrite");
    await Promise.all([...s.map(sv => tx.store.delete(sv._id)), tx.done]);
    return res;
  }
}
