import type { Algorithm, RawCard, Solve, Session, Tutorial, Sheet, CubeEvent, IPC } from '@interfaces';
import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

interface TutorialData {
  0: string;
  1: Tutorial | Tutorial[];
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

interface PDFOptions {
  width: number;
  height: number;
  html: string;
  mode: string;
  round: number;
}

export class DataService {
  ipc: IPC;
  algSub: Writable< Algorithm[] >;
  cardSub: Writable< RawCard[] >;
  tutSub: Writable< TutorialData >;
  solveSub: Writable<SolveSub>;
  contestSub: Writable<ContestSub>;
  sessSub: Writable< { type: string, data: Session | Session[] } >;
  anySub: Writable<AnySub>;
  isElectron: boolean;

  private static _instance: DataService;

  private constructor() {

    this.algSub = writable< Algorithm[] >([]);
    this.cardSub = writable< RawCard[] >([]);
    this.solveSub = writable< SolveSub >();
    this.tutSub = writable< TutorialData >();
    this.sessSub = writable< SessionSub >();
    this.contestSub = writable< ContestSub >();
    this.anySub = writable<AnySub>();

    if ( navigator.userAgent.indexOf('Electron') > -1 ) {
      this.ipc = (<any> window).electronAPI;
      this.isElectron = true;
      this.setIpc();
    } else {
      this.ipc = {} as IPC;
      this.isElectron = false;
    }

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
      this.algSub.set(algs);
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
  }

  getAlgorithms(dir: string): void {
    this.isElectron && this.ipc.getAlgorithms(dir);
  }

  getCards(): void {
    this.isElectron && this.ipc.getCards();
  }

  getTutorials() {
    this.isElectron && this.ipc.getTutorials();
  }

  addTutorial(t: Tutorial) {
    this.isElectron && this.ipc.addTutorial(t);
  }

  updateTutorial(t: Tutorial) {
    this.isElectron && this.ipc.updateTutorial(t);
  }

  getSolves() {
    this.isElectron && this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    this.isElectron && this.ipc.addSolve(s);
  }

  updateSolve(s: Solve) {
    this.isElectron && this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    this.isElectron && this.ipc.removeSolves(s.map(e => e._id));
  }

  getSessions() {
    this.isElectron && this.ipc.getSessions();
  }

  addSession(s: Session) {
    this.isElectron && this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    this.isElectron && this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    this.isElectron && this.ipc.renameSession(s);
  }

  updateSession(s: Session) {
    this.isElectron && this.ipc.updateSession(s);
  }

  addContest(c: CubeEvent) {
    this.isElectron && this.ipc.addContest(c);
  }

  getContests() {
    this.isElectron && this.ipc.getContests();
  }

  updateContest(c: CubeEvent) {
    this.isElectron && this.ipc.updateContest(c);
  }

  removeContests(c: CubeEvent[]) {
    this.isElectron && this.ipc.removeContests(c);
  }

  minimize() {
    this.isElectron && this.ipc.minimize();
  }

  maximize() {
    this.isElectron && this.ipc.maximize();
  }

  close() {
    this.isElectron && this.ipc.close();
  }

  generatePDF(args: PDFOptions) {
    this.isElectron && this.ipc.generatePDF(args);
  }

  zipPDF(s: { name: string, files: Sheet[]}) {
    this.isElectron && this.ipc.zipPDF(s);
  }

  openFile(f: string) {
    this.isElectron && this.ipc.openFile(f);
  }

  revealFile(f: string) {
    this.isElectron && this.ipc.revealFile(f);
  }

  update() {
    this.isElectron && this.ipc.update();
  }

  sleep(s: boolean) {
    this.isElectron && this.ipc.sleep(s);
  }
}
