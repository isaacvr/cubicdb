import type { Algorithm, RawCard, Solve, Session, Tutorial } from '../interfaces';
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

interface SessionSub {
  type: string;
  data: Session[];
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
  
  addSession?: (args?) => any;
  getSessions?: (args?) => any;
  removeSession?: (args?) => any;
  renameSession?: (args?) => any;
  handleSessions?: (args?) => any;

  addTutorial?: (args?) => any;
  getTutorials?: (args?) => any;
  updateTutorial?: (args?) => any;
  handleTutorials?: (args?) => any;

  minimize?: (args?) => any;
  maximize?: (args?) => any;
  close?: (args?) => any;
}

export class DataService {
  ipc: IPC;
  window: BrowserWindow;
  algSub: Writable< Algorithm[] >;
  cardSub: Writable< RawCard[] >;
  tutSub: Writable< TutorialData >;
  solveSub: Writable<SolveSub>;
  sessSub: Writable< { type: string, data: Session | Session[] } >;
  isElectron: boolean;

  private static _instance: DataService;

  private constructor() {

    this.algSub = writable< Algorithm[] >([]);
    this.cardSub = writable< RawCard[] >([]);
    this.solveSub = writable< SolveSub >();
    this.tutSub = writable< TutorialData >();
    this.sessSub = writable< SessionSub >();

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

    this.ipc.handleSolves((_, recs) => {
      this.solveSub.set({
        type: recs[0],
        data: recs[1]
      });
    });

    this.ipc.handleSessions((_, sess) => {
      this.sessSub.set({
        type: sess[0],
        data: sess[1]
      });
    });

  }

  getAlgorithms(dir: string): void {
    // this.isElectron && this.ipc.send('algorithms', dir);
    this.isElectron && this.ipc.getAlgorithms(dir);
  }

  getCards(): void {
    // this.isElectron && this.ipc.send('cards');
    this.isElectron && this.ipc.getCards();
  }

  getTutorials() {
    this.isElectron && this.ipc.getTutorials();
    // this.isElectron && this.ipc.send('get-tutorials');
  }

  addTutorial(t: Tutorial) {
    // this.isElectron && this.ipc.send('add-tutorial', t);
    this.isElectron && this.ipc.addTutorial(t);
  }

  updateTutorial(t: Tutorial) {
    this.isElectron && this.ipc.updateTutorial(t);
  }

  getSolves() {
    // this.isElectron && this.ipc.send('get-solves');
    this.isElectron && this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    // this.isElectron && this.ipc.send('add-solve', s);
    this.isElectron && this.ipc.addSolve(s);
  }

  updateSolve(s: Solve) {
    // this.isElectron && this.ipc.send('update-solve', s);
    this.isElectron && this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    // this.isElectron && this.ipc.send('remove-solves', s.map(e => e._id));
    this.isElectron && this.ipc.removeSolves(s.map(e => e._id));
  }

  getSessions() {
    // this.isElectron && this.ipc.send('get-sessions');
    this.isElectron && this.ipc.getSessions();
  }

  addSession(s: Session) {
    // this.isElectron && this.ipc.send('add-session', s);
    this.isElectron && this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    // this.isElectron && this.ipc.send('remove-session', s);
    this.isElectron && this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    // this.isElectron && this.ipc.send('rename-session', s);
    this.isElectron && this.ipc.renameSession(s);
  }

  minimize() {
    // this.isElectron && this.ipc.send('minimize');
    this.isElectron && this.ipc.minimize();
  }

  maximize() {
    // this.isElectron && this.ipc.send('maximize');
    this.isElectron && this.ipc.maximize();
  }

  close() {
    // this.isElectron && this.ipc.send('close');
    this.isElectron && this.ipc.close();
  }
}
