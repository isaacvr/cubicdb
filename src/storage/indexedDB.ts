import type {
  Algorithm,
  AlgorithmOptions,
  CubeEvent,
  IPC,
  ContestPDFOptions,
  Session,
  Sheet,
  Solve,
  ITutorial,
  UpdateCommand,
  PDFOptions,
  IStorageInfo,
  ICacheDB,
  IDBReconstruction,
} from "@interfaces";
import { clone, getByteSize } from "@helpers/object";
import { openDB, type IDBPDatabase } from "idb";

const DBName = "CubicDB-data";
const AlgorithmStore = "Algorithms";
const TutorialStore = "Tutorials";
const SessionStore = "Sessions";
const SolveStore = "Solves";
const ContestStore = "Contests";
const CacheStore = "Cache";
const dbVersion = 1;
const debug = true;

let algs: Algorithm[] = [];
let tuts: ITutorial[] = [];
let recs: IDBReconstruction[] = [];

function parseDB(strDB: string): any[] {
  return strDB
    .split("\n")
    .map(s => {
      try {
        return JSON.parse(s);
      } catch {}
      return "";
    })
    .filter(e => e);
}

import("../database/algs.db?raw").then(_algs => (algs = parseDB(_algs.default || "")));
import("../database/tutorials.db?raw").then(_tuts => (tuts = parseDB(_tuts.default || "")));
import("../database/reconstructions.db?raw").then(_recs => (recs = parseDB(_recs.default || "")));

interface ICacheImg {
  hash: string;
  img: string;
}

interface DATABASE {}

export class IndexedDBAdaptor implements IPC {
  cache: Map<string, string>;
  DB: IDBPDatabase<DATABASE> | null;
  private initialized = false;
  private isInit = false;

  constructor() {
    this.cache = new Map<string, string>();
    this.DB = null;
    this.init();
  }

  async init() {
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
          // Tutorials
          !db.objectStoreNames.contains(TutorialStore) &&
            db.createObjectStore(TutorialStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", TutorialStore);

          // Solves
          !db.objectStoreNames.contains(SolveStore) &&
            db.createObjectStore(SolveStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", SolveStore);

          // Contests
          !db.objectStoreNames.contains(ContestStore) &&
            db.createObjectStore(ContestStore, { keyPath: "_id", autoIncrement: true });
          debug && console.log("OK: ", ContestStore);

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

      // Ensure at least one session
      if ((await this.DB.getAll(SessionStore)).length === 0) {
        const tx = this.DB.transaction(SessionStore, "readwrite");

        let res = await Promise.all([
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

  addDownloadProgressListener(cb: any) {}
  addDownloadDoneListener(cb: any) {}
  addBluetoothListener(cb: any) {}

  // Algorithms are handled from a fixed object
  getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    if (options.all) return Promise.resolve(clone(algs) as Algorithm[]);
    let fAlgs = algs.filter(a => a.parentPath === options.path) as Algorithm[];
    return Promise.resolve(clone(fAlgs));
  }

  getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    let fAlgs = algs.filter(
      a => a.parentPath === options.path && a.parentPath === options.shortName
    ) as Algorithm[];
    return Promise.resolve(fAlgs.length === 0 ? null : clone(fAlgs[0]));
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

  getTutorials() {
    return Promise.resolve(tuts);
  }

  getTutorial(_puzzle: string, _shortName: string, _lang: string) {
    for (let i = 0, maxi = tuts.length; i < maxi; i += 1) {
      let { puzzle, shortName, lang } = tuts[i];
      if (_puzzle === puzzle && _shortName === shortName && _lang === lang) {
        return Promise.resolve(tuts[i]);
      }
    }

    return Promise.resolve(null);
  }

  addTutorial(t: ITutorial) {
    return Promise.reject();
  }

  updateTutorial(t: ITutorial) {
    return Promise.reject();
  }

  removeTutorial(t: ITutorial) {
    return Promise.reject();
  }

  tutorialsVersion() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  checkTutorials() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  updateTutorials() {
    return Promise.resolve(false);
  }

  addReconstruction(r: IDBReconstruction) {
    return Promise.reject();
  }

  getReconstructions() {
    return Promise.resolve(recs);
  }

  reconstructionsVersion() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  checkReconstructions() {
    return Promise.resolve({ version: "0.0.0", minVersion: "0.0.0" });
  }

  updateReconstructions() {
    return Promise.resolve(false);
  }

  // Solves
  async getSolves() {
    await this.init();
    if (!this.DB) return [];
    return this.DB.getAll(SolveStore) as Promise<Solve[]>;
  }

  async addSolve(s: Solve) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    const tx = this.DB.transaction(SolveStore, "readwrite");
    const sv = clone(s);
    delete sv._id;

    let res = await Promise.all([tx.store.put(sv), tx.done]);
    sv._id = res[0];
    return sv;
  }

  async addSolves(s: Solve[]) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    let ss = s.map(sv => {
      const res: Solve = clone(sv);
      delete res._id;
      return res;
    });

    const tx = this.DB.transaction(SolveStore, "readwrite");

    let res = await Promise.all([...ss.map(sv => tx.store.put(sv)), tx.done]);

    res.pop();
    res.forEach((id, p) => (ss[p]._id = id));

    return ss;
  }

  async updateSolve(s: Solve) {
    await this.init();
    if (!this.DB) return Promise.resolve(s);

    let rs: Solve | undefined = await this.DB.get(SolveStore, s._id);

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

    let res = s.map(s => clone(s));

    if (!this.DB) return Promise.resolve(res);

    const tx = this.DB.transaction(SolveStore, "readwrite");
    await Promise.all([...s.map(sv => tx.store.delete(sv._id)), tx.done]);
    return res;
  }

  // Sessions
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

    let res = await Promise.all([tx.store.put(ss), tx.done]);
    s._id = res[0] as string;
    return s;
  }

  async removeSession(s: Session) {
    await this.init();
    if (!this.DB || !this.DB) return Promise.resolve(s);

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

    let rs: Session | undefined = await this.DB.get(SessionStore, s._id);

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

    let rs: Session | undefined = await this.DB.get(SessionStore, s._id);

    if (rs) {
      rs.name = s.name;
      rs.settings = s.settings;
      const tx = this.DB.transaction(SessionStore, "readwrite");
      await Promise.all([tx.store.put(rs), tx.done]);
      return rs;
    }

    return s;
  }

  // Contests
  addContest(c: CubeEvent) {
    return Promise.reject();
  }
  getContests() {
    return Promise.resolve([]);
  }
  updateContest(c: CubeEvent) {
    return Promise.reject();
  }
  removeContests(c: CubeEvent[]) {
    return Promise.reject();
  }

  // UI handlers
  minimize() {
    return Promise.resolve();
  }
  maximize() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }

  // PDF generation
  generatePDF(args: PDFOptions) {
    return Promise.reject();
  }
  generateContestPDF(args: ContestPDFOptions) {
    return Promise.reject();
  }
  zipPDF(s: { name: string; files: Sheet[] }) {
    return Promise.reject();
  }
  openFile(f: string) {
    return Promise.reject();
  }
  revealFile(f: string) {
    return Promise.reject();
  }

  // Update
  update(cmd: UpdateCommand) {
    return Promise.reject();
  }
  cancelUpdate() {
    return Promise.resolve(true);
  }

  // Power saving options
  sleep(s: boolean) {
    return Promise.resolve();
  }

  connectBluetoothDevice() {
    return Promise.reject();
  }
  cancelBluetoothRequest() {
    return Promise.reject();
  }
  pairingBluetoothResponse() {
    return Promise.reject();
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

  async cacheSave(hash: string, data: string): Promise<void> {
    // await this.init();
    // if (!this.DB) return;
    // const tx = this.DB.transaction(CacheStore, "readwrite");
    // await Promise.all([tx.store.put(<ICacheImg>{ hash, img: data }), tx.done]);
    // this.cache.set(hash, data);
  }

  async cacheGetVideo(hash: string) {
    return null;
  }

  async cacheSaveVideo(hash: string, data: ArrayBuffer) {}

  async clearCache(db: ICacheDB) {
    await this.init();
    if (!this.DB) return;

    const store =
      db === "Algorithms"
        ? AlgorithmStore
        : db === "Cache"
        ? CacheStore
        : db === "Sessions"
        ? SessionStore
        : db === "Solves"
        ? SolveStore
        : TutorialStore;

    const allCache = await this.DB.getAll(store);
    const tx = this.DB.transaction(store, "readwrite");
    await Promise.all([...allCache.map(c => tx.store.delete(c._id)), tx.done]);
  }

  // For IPC only
  algorithmsStorage() {}
  cacheStorage() {}
  vCacheStorage() {}
  sessionsStorage() {}
  solvesStorage() {}
  tutorialsStorage() {}
  reconstructionsStorage() {}

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
      algorithms: getByteSize(algs),
      cache: getByteSize(cache),
      vcache: 0,
      sessions: getByteSize(sessions),
      solves: getByteSize(solves),
      tutorials: getByteSize(tuts),
      reconstructions: getByteSize(recs),
    };
  }

  getAllDisplays() {
    return Promise.resolve([]);
  }
  useDisplay(id: number) {
    return Promise.resolve();
  }

  addExternalConnector() {}

  external() {}
}
