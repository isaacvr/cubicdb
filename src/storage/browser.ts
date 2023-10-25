import { SessionDefaultSettings } from "@constants";
import type { Algorithm, AlgorithmOptions, CubeEvent, IPC, PDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand } from "@interfaces";
import algs from '../database/algs.json';
import tuts from '../database/tutorials.json';

export class BrowserAdaptor implements IPC {
  // private algorithms: Nedb<Algorithm>;
  // private tutorials: Nedb<Tutorial>;
  // private sessions: Nedb<Session>;
  // private solves: Nedb<Solve>;

  constructor() {}

  addDownloadProgressListener(cb: any) {}
  addDownloadDoneListener(cb: any) {}
  
  // Algorithms
  getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    return Promise.resolve([]);
  }

  updateAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }
  
  // Tutorials
  getTutorials() { return Promise.resolve([]); }
  addTutorial(t: Tutorial) { return Promise.reject(); }
  updateTutorial(t: Tutorial) { return Promise.reject(); }
  
  // Solves
  getSolves() { return Promise.resolve([]); }
  addSolve(s: Solve) { return Promise.reject(); }
  addSolves(s: Solve[]) { return Promise.reject(); }
  updateSolve(s: Solve) { return Promise.reject(); }
  removeSolves(s: Solve[]) { return Promise.reject(); }
  
  // Sessions
  getSessions() {
    return Promise.resolve([{
      _id: '',
      name: 'Default',
      settings: Object.assign({}, SessionDefaultSettings)
    }]);
  }

  addSession(s: Session) { return Promise.reject(); }

  removeSession(s: Session) { return Promise.reject(); }
  renameSession(s: Session) { return Promise.reject(); }
  updateSession(s: Session) { return Promise.reject(); }
  
  // Contests
  addContest(c: CubeEvent) { return Promise.reject(); }
  getContests() { return Promise.resolve([]); }
  updateContest(c: CubeEvent) { return Promise.reject(); }
  removeContests(c: CubeEvent[]) { return Promise.reject(); }

  // UI handlers
  minimize() { return Promise.resolve(); }
  maximize() { return Promise.resolve(); }
  close() { return Promise.resolve(); }

  // PDF generation
  generatePDF(args: PDFOptions) { return Promise.reject(); }
  zipPDF(s: { name: string, files: Sheet[]}) { return Promise.reject(); }
  openFile(f: string) { return Promise.reject(); }
  revealFile(f: string) { return Promise.reject(); }

  // Update
  update(cmd: UpdateCommand) { return Promise.reject(); }

  // Power saving options
  sleep(s: boolean) { return Promise.resolve(); }

  connectBluetoothDevice() { return Promise.reject(); }
  cancelBluetoothRequest() { return Promise.reject(); }
  pairingBluetoothResponse() { return Promise.reject(); }
  
  cacheCheckImage(hash: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  cacheGetImage(hash: string): Promise<string> {
    return Promise.resolve('');
  }
  
  cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    return Promise.resolve([]);
  }

  cacheSaveImage(hash: string, data: string): Promise<void> {
    return Promise.resolve();
  }

  getAllDisplays() { return Promise.resolve([]); }
  useDisplay(id: number) { return Promise.resolve(); }
}