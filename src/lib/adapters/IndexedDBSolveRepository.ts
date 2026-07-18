import { openDB, type IDBPDatabase } from "idb";
import type { Solve } from "@domain/Solve";
import type { ISolveRepository } from "@ports/ISolveRepository";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";
import { filterSolvesByQuery } from "$lib/data-services/SolveIPC/solveIPC.browser";

const DB_NAME = "CubicDB-data";
const SOLVE_STORE = "Solves";
const DB_VERSION = 1;

interface DATABASE { }

export class IndexedDBSolveRepository implements ISolveRepository {

  private dbPromise: Promise<IDBPDatabase<DATABASE>> | null = null;

  private async getDB() {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: async db => {
        if (!db.objectStoreNames.contains(SOLVE_STORE)) {
          db.createObjectStore(SOLVE_STORE, { keyPath: "_id", autoIncrement: true });
        }
      },
    });

    this.dbPromise.catch(err => {
      this.dbPromise = null;
      throw err;
    });

    return this.dbPromise;
  }

  async getSolves(query?: SolveListQuery): Promise<Solve[]> {
    const db = await this.getDB();
    const solves = await db.getAll(SOLVE_STORE) as Solve[];
    return filterSolvesByQuery(solves as any, query) as Solve[];
  }

  async addSolve(s: Solve): Promise<Solve> {
    const db = await this.getDB();
    const tx = db.transaction(SOLVE_STORE, "readwrite");
    const sv = structuredClone(s);
    delete (sv as any)._id;

    const [id] = await Promise.all([
      tx.store.put(sv),
      tx.done
    ]);

    (sv as any)._id = id;
    return sv;
  }

  async addSolves(solves: Solve[]): Promise<Solve[]> {
    const db = await this.getDB();

    const ss = solves.map(sv => {
      const res: Solve = structuredClone(sv);
      delete (res as any)._id;
      return res;
    });

    const tx = db.transaction(SOLVE_STORE, "readwrite");

    const res = await Promise.all([
      ...ss.map(sv => tx.store.put(sv)),
      tx.done
    ]);

    res.pop(); // tx.done
    res.forEach((id, i) => ((ss[i] as any)._id = id));

    return ss;
  }

  async updateSolve(s: Solve): Promise<Solve> {
    const db = await this.getDB();
    const rs = await db.get(SOLVE_STORE, (s as any)._id);

    if (rs) {
      rs.comments = s.comments;
      rs.penalty = s.penalty;
      rs.time = s.time;

      const tx = db.transaction(SOLVE_STORE, "readwrite");
      await Promise.all([tx.store.put(rs), tx.done]);

      return rs;
    }

    return s;
  }

  async removeSolves(solves: Solve[]): Promise<Solve[]> {
    const db = await this.getDB();
    const res = solves.map(s => structuredClone(s));
    const tx = db.transaction(SOLVE_STORE, "readwrite");

    await Promise.all([
      ...solves.map(sv => tx.store.delete((sv as any)._id)),
      tx.done
    ]);

    return res;
  }

  createEmptySolve(p?: Partial<Solve>): Solve {
    return {
      time: 0,
      penalty: undefined,
      comments: "",
      ...p,
    } as Solve;
  }
}
