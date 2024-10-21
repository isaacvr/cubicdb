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
import { clone } from "@helpers/object";

let algs: Algorithm[] = [];
let tuts: ITutorial[] = [];
let recs: IDBReconstruction[] = [];
let loaded = false;

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

async function loadData() {
  const _algs = await import("$lib/fixed/algs.db?raw");
  const _tuts = await import("$lib/fixed/tutorials.db?raw");
  const _recs = await import("$lib/fixed/reconstructions.db?raw");

  algs = parseDB(_algs.default || "");
  tuts = parseDB(_tuts.default || "");
  recs = parseDB(_recs.default || "");
}

export class NoopAdaptor implements IPC {
  isInit = false;
  initialized = false;
  constructor() {}

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

    await loadData();

    this.initialized = true;
    this.isInit = false;
  }

  addDownloadProgressListener(cb: any) {}
  addDownloadDoneListener(cb: any) {}
  addBluetoothListener(cb: any) {}

  // Algorithms are handled from a fixed object
  async getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    await this.init();
    if (options.all) clone(algs) as Algorithm[];
    let fAlgs = algs.filter(a => a.parentPath === options.path) as Algorithm[];
    return clone(fAlgs);
  }

  async getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    await this.init();
    let fAlgs = algs.filter(
      a => a.parentPath === options.path && a.shortName === options.shortName
    ) as Algorithm[];
    return fAlgs.length === 0 ? null : clone(fAlgs[0]);
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

  async getTutorials() {
    await this.init();
    return tuts;
  }

  async getTutorial(_puzzle: string, _shortName: string, _lang: string) {
    await this.init();

    for (let i = 0, maxi = tuts.length; i < maxi; i += 1) {
      let { puzzle, shortName, lang } = tuts[i];
      if (_puzzle === puzzle && _shortName === shortName && _lang === lang) {
        tuts[i];
      }
    }

    return null;
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

  async getReconstructions() {
    await this.init();
    return recs;
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
    return [];
  }

  async addSolve(s: Solve) {
    return Promise.reject();
  }

  async addSolves(s: Solve[]) {
    return Promise.reject();
  }

  async updateSolve(s: Solve) {
    return Promise.reject();
  }

  async removeSolves(s: Solve[]): Promise<Solve[]> {
    return Promise.reject();
  }

  // Sessions
  async getSessions() {
    return [];
  }

  async addSession(s: Session) {
    return Promise.reject();
  }

  async removeSession(s: Session) {
    return Promise.reject();
  }

  async renameSession(s: Session) {
    return Promise.reject();
  }

  async updateSession(s: Session) {
    return Promise.reject();
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
    return false;
  }

  async cacheGetImage(hash: string): Promise<string> {
    return "";
  }

  async cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    return hashes.map(() => "");
  }

  async cacheSaveImage(hash: string, data: string): Promise<void> {}

  async cacheSave(hash: string, data: string): Promise<void> {}

  async cacheGetVideo(hash: string) {
    return null;
  }

  async cacheSaveVideo(hash: string, data: ArrayBuffer) {}

  async clearCache(db: ICacheDB) {}

  // For IPC only
  algorithmsStorage() {}
  cacheStorage() {}
  vCacheStorage() {}
  sessionsStorage() {}
  solvesStorage() {}
  tutorialsStorage() {}
  reconstructionsStorage() {}

  async getStorageInfo(): Promise<IStorageInfo> {
    return {
      algorithms: 0,
      cache: 0,
      sessions: 0,
      solves: 0,
      tutorials: 0,
      vcache: 0,
      reconstructions: 0,
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
