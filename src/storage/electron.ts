import { getByteSize } from "@helpers/object";
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
} from "@interfaces";

export class ElectronAdaptor implements IPC {
  private ipc: IPC;
  private cache: Map<string, string>;

  constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
    this.cache = new Map();
    this.init();
  }

  async init() {
    let c = await (this.ipc as any).cacheGetAll();

    for (let i = 0, maxi = c.length; i < maxi; i += 1) {
      let cc = c[i];
      this.cache.set(cc[0], cc[1]);
    }
  }

  getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    return this.ipc.getAlgorithms(options);
  }

  getAlgorithm(options: AlgorithmOptions): Promise<Algorithm | null> {
    return this.ipc.getAlgorithm(options);
  }

  addDownloadProgressListener(cb: any) {
    this.ipc.addDownloadProgressListener(cb);
  }

  addDownloadDoneListener(cb: any) {
    this.ipc.addDownloadDoneListener(cb);
  }

  addBluetoothListener(cb: any) {
    this.ipc.addBluetoothListener(cb);
  }

  updateAlgorithm(alg: Algorithm) {
    let cp = { ...alg };

    delete cp._puzzle;

    return this.ipc.updateAlgorithm(cp);
  }

  addAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return this.ipc.addAlgorithm(cp);
  }

  removeAlgorithm(alg: Algorithm) {
    let cp = { ...alg };
    delete cp._puzzle;
    return this.ipc.removeAlgorithm(cp);
  }

  algorithmsVersion() {
    return this.ipc.algorithmsVersion();
  }

  checkAlgorithms() {
    return this.ipc.checkAlgorithms();
  }

  getTutorials() {
    return this.ipc.getTutorials();
  }

  getTutorial(puzzle: string, shortName: string, lang: string) {
    return this.ipc.getTutorial(puzzle, shortName, lang);
  }

  addTutorial(t: ITutorial) {
    return this.ipc.addTutorial(t);
  }

  updateTutorial(t: ITutorial) {
    return this.ipc.updateTutorial(t);
  }

  removeTutorial(t: ITutorial) {
    return this.ipc.removeTutorial(t);
  }
  
  tutorialsVersion() {
    return this.ipc.tutorialsVersion();
  }

  checkTutorials() {
    return this.ipc.checkTutorials();
  }

  getSolves() {
    return this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    return this.ipc.addSolve(s);
  }

  addSolves(s: Solve[]) {
    return this.ipc.addSolves(s);
  }

  updateSolve(s: Solve) {
    return this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    return this.ipc.removeSolves(s);
  }

  getSessions() {
    return this.ipc.getSessions();
  }

  addSession(s: Session) {
    return this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    return this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    return this.ipc.renameSession(s);
  }

  updateSession(s: Session) {
    return this.ipc.updateSession(s);
  }

  addContest(c: CubeEvent) {
    return this.ipc.addContest(c);
  }

  getContests() {
    return this.ipc.getContests();
  }

  updateContest(c: CubeEvent) {
    return this.ipc.updateContest(c);
  }

  removeContests(c: CubeEvent[]) {
    return this.ipc.removeContests(c);
  }

  minimize() {
    return this.ipc.minimize();
  }

  maximize() {
    return this.ipc.maximize();
  }

  close() {
    return this.ipc.close();
  }

  generatePDF(args: PDFOptions) {
    return this.ipc.generatePDF(args);
  }

  generateContestPDF(args: ContestPDFOptions) {
    return this.ipc.generateContestPDF(args);
  }

  zipPDF(s: { name: string; files: Sheet[] }) {
    return this.ipc.zipPDF(s);
  }

  openFile(f: string) {
    return this.ipc.openFile(f);
  }

  revealFile(f: string) {
    return this.ipc.revealFile(f);
  }

  update(cmd: UpdateCommand) {
    return this.ipc.update(cmd);
  }

  cancelUpdate() {
    return this.ipc.cancelUpdate();
  }

  sleep(s: boolean) {
    return this.ipc.sleep(s);
  }

  connectBluetoothDevice(id: string) {
    return this.ipc.connectBluetoothDevice(id);
  }

  cancelBluetoothRequest() {
    return this.ipc.cancelBluetoothRequest();
  }

  pairingBluetoothResponse() {
    return this.ipc.pairingBluetoothResponse();
  }

  cacheCheckImage(hash: string): Promise<boolean> {
    return this.ipc.cacheCheckImage(hash);
  }

  cacheGetImage(hash: string): Promise<string> {
    // return this.ipc.cacheGetImage(hash);
    return Promise.resolve(this.cache.get(hash) || "");
  }

  cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    // return this.ipc.cacheGetImageBundle(hashes);
    return Promise.resolve(hashes.map(h => this.cache.get(h) || ""));
  }

  cacheSaveImage(hash: string, data: string): Promise<void> {
    this.cache.set(hash, data);
    return this.ipc.cacheSaveImage(hash, data);
  }

  clearCache(db: ICacheDB) {
    switch (db) {
      case "Cache": {
        this.cache.clear();
      }
      case "Solves":
      case "Sessions": {
        return this.ipc.clearCache(db);
      }
    }

    return Promise.resolve();
  }

  // For IPC only
  algorithmsStorage() {}
  cacheStorage() {}
  sessionsStorage() {}
  solvesStorage() {}
  tutorialsStorage() {}

  async getStorageInfo(): Promise<IStorageInfo> {
    let algorithms = await this.ipc.algorithmsStorage();
    let cache = await this.ipc.cacheStorage();
    let sessions = await this.ipc.sessionsStorage();
    let solves = await this.ipc.solvesStorage();
    let tutorials = await this.ipc.tutorialsStorage();

    return {
      algorithms,
      cache,
      sessions,
      solves,
      tutorials,
    };
  }

  getAllDisplays() {
    return this.ipc.getAllDisplays();
  }

  useDisplay(id: number) {
    return this.ipc.useDisplay(id);
  }

  addExternalConnector(cb: any) {
    this.ipc.addExternalConnector(cb);
  }

  external(device: string, ...args: any[]) {
    this.ipc.external(device, ...args);
  }
}
