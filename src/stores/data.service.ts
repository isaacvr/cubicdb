import type { Algorithm, RawCard, Solve, Session, Tutorial, Sheet, CubeEvent, IPC, PDFOptions, UpdateCommand } from '@interfaces';
import { ElectronAdaptor, BrowserAdaptor, NoopAdaptor } from '@storage/index';
import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

interface TutorialData {
  0: string;
  1: Tutorial | Tutorial[];
}

interface AlgSub {
  type: string;
  data: Algorithm | Algorithm[];
}

interface SolveSub {
  type: string;
  data: Solve | Solve[];
}

interface ContestSub {
  type: string;
  data: CubeEvent | CubeEvent[];
}

interface SessionSub {
  type: string;
  data: Session[];
}

interface AnySub {
  type: string;
  data: any;
}

export class DataService {
  ipc: IPC;
  algSub: Writable< AlgSub >;
  cardSub: Writable< RawCard[] >;
  tutSub: Writable< TutorialData >;
  solveSub: Writable<SolveSub>;
  contestSub: Writable<ContestSub>;
  sessSub: Writable< { type: string, data: Session | Session[] } >;
  anySub: Writable<AnySub>;
  updateSub: Writable<AnySub>;

  private static _instance: DataService;

  private constructor() {

    this.algSub = writable< AlgSub >();
    this.cardSub = writable< RawCard[] >([]);
    this.solveSub = writable< SolveSub >();
    this.tutSub = writable< TutorialData >();
    this.sessSub = writable< SessionSub >();
    this.contestSub = writable< ContestSub >();
    this.anySub = writable<AnySub>();
    this.updateSub = writable<AnySub>();

    if ( navigator.userAgent.indexOf('Electron') > -1 ) {
      this.ipc = new ElectronAdaptor();
    } else {
      // this.ipc = new NoopAdaptor();
      this.ipc = new BrowserAdaptor();
    }

    this.setIpc();

  }

  static getInstance(): DataService {
    if ( DataService._instance ) {
      return DataService._instance;
    }
    return DataService._instance = new DataService();
  }

  setIpc() {
    this.ipc.handleTutorials((_: any, tuts: any) => {
      this.tutSub.set(tuts);
    })

    this.ipc.handleAlgorithms((_: any, algs: any) => {
      this.algSub.set({
        type: algs[0],
        data: algs[1]
      });
    });

    this.ipc.handleCards((_: any, cards: any) => {
      this.cardSub.set(cards);
    });

    this.ipc.handleSolves((_: any, slv: any) => {
      this.solveSub.set({
        type: slv[0],
        data: slv[1]
      });
    });
    
    this.ipc.handleContests((_: any, cnt: any) => {
      this.contestSub.set({
        type: cnt[0],
        data: cnt[1]
      });
    });

    this.ipc.handleSessions((_: any, sess: any) => {
      this.sessSub.set({
        type: sess[0],
        data: sess[1]
      });
    });

    this.ipc.handleAny((_: any, ev: any) => {
      this.anySub.set({
        type: ev[0],
        data: ev[1],
      });
    });

    this.ipc.handleUpdate((_: any, ev: any) => {
      this.updateSub.set({
        type: ev[0],
        data: ev.slice(1),
      });
    });
  }

  getAlgorithms(path: string, all?: boolean): void {
    this.ipc.getAlgorithms({ all, path });
  }

  updateAlgorithm(alg: Algorithm) {
    this.ipc.updateAlgorithm(alg);
  }

  getCards(): void {
    this.ipc.getCards();
  }

  getTutorials() {
    this.ipc.getTutorials();
  }

  addTutorial(t: Tutorial) {
    this.ipc.addTutorial(t);
  }

  updateTutorial(t: Tutorial) {
    this.ipc.updateTutorial(t);
  }

  getSolves() {
    this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    this.ipc.addSolve(s);
  }

  updateSolve(s: Solve) {
    this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    this.ipc.removeSolves(s);
  }

  getSessions() {
    this.ipc.getSessions();
  }

  addSession(s: Session) {
    this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    this.ipc.renameSession(s);
  }

  updateSession(s: Session) {
    this.ipc.updateSession(s);
  }

  addContest(c: CubeEvent) {
    this.ipc.addContest(c);
  }

  getContests() {
    this.ipc.getContests();
  }

  updateContest(c: CubeEvent) {
    this.ipc.updateContest(c);
  }

  removeContests(c: CubeEvent[]) {
    this.ipc.removeContests(c);
  }

  minimize() {
    this.ipc.minimize();
  }

  maximize() {
    this.ipc.maximize();
  }

  close() {
    this.ipc.close();
  }

  generatePDF(args: PDFOptions) {
    this.ipc.generatePDF(args);
  }

  zipPDF(s: { name: string, files: Sheet[]}) {
    this.ipc.zipPDF(s);
  }

  openFile(f: string) {
    this.ipc.openFile(f);
  }

  revealFile(f: string) {
    this.ipc.revealFile(f);
  }

  update(cmd: UpdateCommand) {
    this.ipc.update(cmd);
  }

  sleep(s: boolean) {
    this.ipc.sleep(s);
  }
}
