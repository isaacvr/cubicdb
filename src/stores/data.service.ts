import type { Algorithm, RawCard, Solve, Session, Tutorial, Sheet, CubeEvent } from '../interfaces';
import type { IpcRenderer, BrowserWindow } from 'electron';
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

interface PDFOptions {
  width: number;
  height: number;
  html: string;
  mode: string;
  round: number;
}

interface IPC extends IpcRenderer {
  getAlgorithms?: (args?) => any;
  handleAlgorithms?: (args?) => any;
  
  getCards?: (args?) => any;
  handleCards?: (args?) => any;
  
  addSolve?: (args?) => any;
  getSolves?: (args?) => any;
  updateSolve?: (args?) => any;
  removeSolves?: (args?) => any;
  handleSolves?: (args?) => any;
  
  addContest?: (args?) => any;
  getContests?: (args?) => any;
  updateContest?: (args?) => any;
  removeContests?: (args?) => any;
  handleContests?: (args?) => any;
  
  addSession?: (args?) => any;
  getSessions?: (args?) => any;
  removeSession?: (args?) => any;
  renameSession?: (args?) => any;
  updateSession?: (args?) => any;
  handleSessions?: (args?) => any;

  addTutorial?: (args?) => any;
  getTutorials?: (args?) => any;
  updateTutorial?: (args?) => any;
  handleTutorials?: (args?) => any;

  minimize?: (args?) => any;
  maximize?: (args?) => any;
  close?: (args?) => any;
  generatePDF?: (args?) => any;
  zipPDF?: (args?) => any;
  openFile?: (args?) => any;
  revealFile?: (args?) => any;
  handleAny?: (args?) => any;
}

export class DataService {
  ipc: IPC;
  window: BrowserWindow;
  algSub: Writable< Algorithm[] >;
  cardSub: Writable< RawCard[] >;
  tutSub: Writable< TutorialData >;
  solveSub: Writable<SolveSub>;
  contestSub: Writable<ContestSub>;
  sessSub: Writable< { type: string, data: Session | Session[] } >;
  anySub: Writable<any>;
  isElectron: boolean;

  private static _instance: DataService;

  private constructor() {

    this.algSub = writable< Algorithm[] >([]);
    this.cardSub = writable< RawCard[] >([]);
    this.solveSub = writable< SolveSub >();
    this.tutSub = writable< TutorialData >();
    this.sessSub = writable< SessionSub >();
    this.contestSub = writable< ContestSub >();
    this.anySub = writable<any>();

    if ( navigator.userAgent.indexOf('Electron') ) {
      this.ipc = (<any> window).electronAPI;
      this.isElectron = true;
      this.setIpc();
    } else {
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
    this.ipc.handleTutorials((_, tuts) => {
      this.tutSub.set(tuts);
    })

    this.ipc.handleAlgorithms((_, algs) => {
      this.algSub.set(algs);
    });

    this.ipc.handleCards((_, cards) => {
      this.cardSub.set(cards);
    });

    this.ipc.handleSolves((_, slv) => {
      this.solveSub.set({
        type: slv[0],
        data: slv[1]
      });
    });
    
    this.ipc.handleContests((_, cnt) => {
      this.contestSub.set({
        type: cnt[0],
        data: cnt[1]
      });
    });

    this.ipc.handleSessions((_, sess) => {
      this.sessSub.set({
        type: sess[0],
        data: sess[1]
      });
    });

    this.ipc.handleAny((_, ev) => {
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
}
