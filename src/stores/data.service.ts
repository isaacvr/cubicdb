/// <reference types="web-bluetooth" />

import { Emitter } from '@classes/Emitter';
import { GANInput } from '@components/timer/input-handlers/GAN';
import { QiYiSmartTimerInput } from '@components/timer/input-handlers/QY-Timer';
import type { Algorithm, Solve, Session, Tutorial, Sheet, CubeEvent, IPC, PDFOptions, UpdateCommand } from '@interfaces';
import { ElectronAdaptor, BrowserAdaptor } from '@storage/index';
import type { Display } from 'electron';
import { writable } from 'svelte/store';

type DownloadEvent = 'download-progress' | 'update-downloaded';

function extractKey(obj: any, key: any): any {
  return { [key]: obj[key] };
}

export class DataService {
  private emitter: Emitter;
  private ipc: IPC;
  private static _instance: DataService;
  private _isMobile = writable(false);

  private constructor() {
    this.emitter = new Emitter();

    // @ts-ignore
    if ( window.electronAPI ) {
      this.ipc = new ElectronAdaptor();
    } else {
      // this.ipc = new NoopAdaptor();
      this.ipc = new BrowserAdaptor();
    }

    this.setIpc();

    this._isMobile.set(window.innerWidth <= 768);

    window.addEventListener('resize', () => {
      this._isMobile.set(window.innerWidth <= 768);
    });
  }

  static getInstance(): DataService {
    if ( DataService._instance ) {
      return DataService._instance;
    }
    return DataService._instance = new DataService();
  }

  get isMobile() {
    return this._isMobile;
  }

  setIpc() {
    this.ipc.addDownloadProgressListener((_, progress: number) => {
      this.emitter.emit('download-progress', progress);
      console.log('download-progress', progress);
    });

    this.ipc.addDownloadDoneListener(() => {
      this.emitter.emit('update-downloaded');
      console.log('update-downloaded')
    }); 
  }

  on(ev: DownloadEvent, cb: (...args: any[]) => any) {
    this.emitter.on(ev, cb);
  }

  off(ev: DownloadEvent, cb: (...args: any[]) => any) {
    this.emitter.off(ev, cb);
  }

  getAlgorithms(path: string, all?: boolean): Promise<Algorithm[]> {
    return this.ipc.getAlgorithms({ all, path });
  }

  updateAlgorithm(alg: Algorithm) {
    return this.ipc.updateAlgorithm(alg);
  }

  getTutorials() {
    return this.ipc.getTutorials();
  }

  addTutorial(t: Tutorial) {
    return this.ipc.addTutorial(t);
  }

  updateTutorial(t: Tutorial) {
    return this.ipc.updateTutorial(t);
  }

  getSolves() {
    return this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    let ts: Solve = Object.assign({}, s);
    delete ts._id;

    return this.ipc.addSolve(ts);
  }

  addSolves(s: Solve[]) {
    return this.ipc.addSolves( s.map(sv => {
      let ts: Solve = Object.assign({}, sv);
      delete ts._id;
      
      return ts;
    }) );
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
    return this.ipc.removeSession( extractKey(s, '_id') as Session );
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

  zipPDF(s: { name: string, files: Sheet[]}) {
    return this.ipc.zipPDF(s);
  }

  openFile(f: string) {
    return this.ipc.openFile("file://" + f);
  }

  openURL(url: string) {
    return this.ipc.openFile(url);
  }

  revealFile(f: string) {
    return this.ipc.revealFile(f);
  }

  update(cmd: UpdateCommand) {
    return this.ipc.update(cmd);
  }

  sleep(s: boolean) {
    return this.ipc.sleep(s);
  }

  connectBluetoothDevice(id: string) {
    localStorage.setItem('bluetooth-mac', id);
    return this.ipc.connectBluetoothDevice(id);
  }

  cancelBluetoothRequest() {
    localStorage.removeItem('bluetooth-mac');
    return this.ipc.cancelBluetoothRequest();
  }

  pairingBluetoothResponse() {
    return this.ipc.pairingBluetoothResponse();
  }

  searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string> {
    let filters = inp instanceof GANInput ? GANInput.BLUETOOTH_FILTERS : QiYiSmartTimerInput.BLUETOOTH_FILTERS;

    console.log("FILTERS: ", filters);

    return new Promise((res, rej) => {
      navigator.bluetooth.requestDevice( filters )
        .then(async(device) => {
          inp.fromDevice( device ).then(res).catch(rej);
        }).catch(rej);
    });
  }

  cacheCheckImage(hash: string): Promise<boolean> {
    return this.ipc.cacheCheckImage(hash);
  }

  cacheGetImage(hash: string): Promise<string> {
    return this.ipc.cacheGetImage(hash);
  }

  cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    return this.ipc.cacheGetImageBundle(hashes);
  }

  cacheSaveImage(hash: string, data: string): Promise<void> {
    return this.ipc.cacheSaveImage(hash, data);
  }

  getAllDisplays(): Promise<Display[]> {
    return this.ipc.getAllDisplays();
  }

  useDisplay(id: number): Promise<void> {
    return this.ipc.useDisplay(id);
  }
}
