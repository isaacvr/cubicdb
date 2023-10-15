import { SessionDefaultSettings } from "@constants";
import type { Algorithm, AlgorithmOptions, CubeEvent, IPC, PDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand } from "@interfaces";
import algs from '../database/algs.json';
import tuts from '../database/tutorials.json';

export class BrowserAdaptor implements IPC {
  // private algorithms: Nedb<Algorithm>;
  // private tutorials: Nedb<Tutorial>;
  // private sessions: Nedb<Session>;
  // private solves: Nedb<Solve>;

  private session_handler?: Function;

  constructor() {}

  // Handlers
  handleAlgorithms(fn: Function) {}
  handleAny(fn: Function) {}
  handleCards(fn: Function) {}
  handleContests(fn: Function) {}

  handleSessions(fn: Function) {
    this.session_handler = fn;
    console.log('Add session handler');
  }
  
  handleSolves(fn: Function) {}
  handleTutorials(fn: Function) {}
  handleUpdate(fn: Function) {}
  
  // Algorithms
  getAlgorithms(options: AlgorithmOptions): void {}
  updateAlgorithm(alg: Algorithm): void {}
  
  // Cards
  getCards(): void {}
  
  // Tutorials
  getTutorials() {}
  addTutorial(t: Tutorial) {}
  updateTutorial(t: Tutorial) {}
  
  // Solves
  getSolves() {}
  addSolve(s: Solve) {}
  updateSolve(s: Solve) {}
  removeSolves(s: Solve[]) {}
  
  // Sessions
  getSessions() {
    // this.sessions.find({}, (res: any) => {
    //   console.log("SESSIONS: ", res);
    // });

    console.log('get-sessions');

    this.session_handler && this.session_handler(null, ['get-sessions', [{
      _id: '',
      name: 'Default',
      settings: Object.assign({}, SessionDefaultSettings)
    }]]);
  }

  addSession(s: Session) {
    console.log('add-session');

    this.session_handler && this.session_handler(null, ['add-session', s]);
  }

  removeSession(s: Session) { console.log('remove-session !'); }
  renameSession(s: Session) { console.log('rename-session !'); }
  updateSession(s: Session) { console.log('update-session !'); }
  
  // Contests
  addContest(c: CubeEvent) {}
  getContests() {}
  updateContest(c: CubeEvent) {}
  removeContests(c: CubeEvent[]) {}

  // UI handlers
  minimize() {}
  maximize() {}
  close() {}

  // PDF generation
  generatePDF(args: PDFOptions) {}
  zipPDF(s: { name: string, files: Sheet[]}) {}
  openFile(f: string) {}
  revealFile(f: string) {}

  // Update
  update(cmd: UpdateCommand) {}

  // Power saving options
  sleep(s: boolean) {}

  connectBluetoothDevice() {}
  cancelBluetoothRequest() {}
  pairingBluetoothResponse() {}
  handleBluetooth() {}
}