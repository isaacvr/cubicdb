import type { Algorithm, AlgorithmOptions, CubeEvent, IPC, PDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand } from "@interfaces";
import type Nedb from "nedb";
// @ts-ignore
import NeDB from 'nedb/browser-version/out/nedb.min';

export class BrowserAdaptor implements IPC {
  private algorithms: Nedb<Algorithm>;
  private tutorials: Nedb<Tutorial>;
  private sessions: Nedb<Session>;
  private solves: Nedb<Solve>;

  constructor() {
    this.algorithms = new NeDB({ filename: 'algorithms.db', autoload: true });
    this.tutorials = new NeDB({ filename: 'tutorials.db', autoload: true });
    this.sessions = new NeDB({ filename: 'sessions.db', autoload: true });
    this.solves = new NeDB({ filename: 'solves.db', autoload: true });
  }

  // Handlers
  handleAlgorithms(fn: Function) {}
  handleAny(fn: Function) {}
  handleCards(fn: Function) {}
  handleContests(fn: Function) {}
  handleSessions(fn: Function) {}
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
    this.sessions.find({}, (res: any) => {
      console.log("SESSIONS: ", res);
    });
  }

  addSession(s: Session) {}
  removeSession(s: Session) {}
  renameSession(s: Session) {}
  updateSession(s: Session) {}
  
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
}