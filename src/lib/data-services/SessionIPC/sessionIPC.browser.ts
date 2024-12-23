import type { Session, Solve } from "@interfaces";
import type { SessionIPC } from "./sessionIPC.interface";
import { openDB, type IDBPDatabase } from "idb";

const DBName = "CubicDB-data";
const SessionStore = "Sessions";
const SolveStore = "Solves";
const dbVersion = 1;
const debug = false;

interface DATABASE {}

export class SessionBrowserIPC implements SessionIPC {
  DB: IDBPDatabase<DATABASE> | null;
  private initialized = false;
  private isInit = false;

  private constructor() {
    this.DB = null;
    this.init();
  }

  private static _instance: SessionBrowserIPC | null = null;

  static getInstance() {
    if (!SessionBrowserIPC._instance) {
      SessionBrowserIPC._instance = new SessionBrowserIPC();
    }

    return SessionBrowserIPC._instance;
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
          // Sessions
          !db.objectStoreNames.contains(SessionStore) &&
            db.createObjectStore(SessionStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", SessionStore);
        },
      });

      // Ensure at least one session
      if ((await this.DB.getAll(SessionStore)).length === 0) {
        const tx = this.DB.transaction(SessionStore, "readwrite");

        await Promise.all([
          tx.store.put(<Session>{
            name: "Session 1",
            settings: {
              hasInspection: true,
              inspection: 15,
              showElapsedTime: true,
              calcAoX: 0,
              genImage: true,
              scrambleAfterCancel: false,
              input: "Keyboard",
              withoutPrevention: true,
              recordCelebration: true,
              showBackFace: false,
              sessionType: "mixed",
            },
          }),
          tx.done,
        ]);
      }
    } catch (err) {
      console.log("ERROR: ", err);
    }

    this.initialized = true;
    this.isInit = false;
  }

  async getSessions() {
    await this.init();
    if (!this.DB) return [];

    return this.DB.getAll(SessionStore) as Promise<Session[]>;
  }

  async addSession(s: Session) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    const tx = this.DB.transaction(SessionStore, "readwrite");

    const ss = {
      name: s.name,
      settings: s.settings,
      tName: s.tName || "",
    };

    const res = await Promise.all([tx.store.put(ss), tx.done]);
    s._id = res[0] as string;
    return s;
  }

  async removeSession(s: Session) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    const allSolves = (await this.DB.getAll(SolveStore)).filter(
      (sv: Solve) => sv.session === s._id
    );
    const stx = this.DB.transaction(SolveStore, "readwrite");

    await Promise.all([...allSolves.map(sv => stx.store.delete(sv._id)), stx.done]);

    const tx = this.DB.transaction(SessionStore, "readwrite");

    await Promise.all([tx.store.delete(s._id), tx.done]);
    return s;
  }

  async renameSession(s: Session) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    const rs: Session | undefined = await this.DB.get(SessionStore, s._id);

    if (rs) {
      rs.name = s.name;
      const tx = this.DB.transaction(SessionStore, "readwrite");
      await Promise.all([tx.store.put(rs), tx.done]);
      return rs;
    }

    return s;
  }

  async updateSession(s: Session) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    const rs: Session | undefined = await this.DB.get(SessionStore, s._id);

    if (rs) {
      rs.name = s.name;
      rs.settings = s.settings;
      const tx = this.DB.transaction(SessionStore, "readwrite");
      await Promise.all([tx.store.put(rs), tx.done]);
      return rs;
    }

    return s;
  }
}
