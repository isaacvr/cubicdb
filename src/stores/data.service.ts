/// <reference types="web-bluetooth" />

import { Emitter } from '@classes/Emitter';
import { GANInput } from '@components/timer/input-handlers/GAN';
import { QiYiSmartTimerInput } from '@components/timer/input-handlers/QY-Timer';
import type { Algorithm, Solve, Session, Tutorial, Sheet, CubeEvent, IPC, ContestPDFOptions, UpdateCommand, PDFOptions, ICacheDB } from '@interfaces';
import { ElectronAdaptor, IndexedDBAdaptor } from '@storage/index';
import type { Display } from 'electron';
import { writable, type Writable } from 'svelte/store';

type DownloadEvent = 'download-progress' | 'update-downloaded';
type BluetoothEvent = 'bluetooth';
type TimerEvent = 'scramble';
type ExternalEvent = 'external';
type DataEvent = DownloadEvent | BluetoothEvent | TimerEvent | ExternalEvent | string & {};

interface ExternalTimer {
  id: string;
  name: string;
}

function extractKey(obj: any, key: any): any {
  return { [key]: obj[key] };
}

export class DataService {
  private emitter: Emitter;
  private ipc: IPC;
  private static _instance: DataService;
  private _isElectron: boolean;
  externalTimers: Writable<ExternalTimer[]>;

  private constructor() {
    this.emitter = new Emitter();
    this.externalTimers = writable([]);

    // @ts-ignore
    if ( window.electronAPI ) {
      this.ipc = new ElectronAdaptor();
      this._isElectron = true;
    } else {
      this.ipc = new IndexedDBAdaptor();
      this._isElectron = false;
    }

    this.setIpc();
  }

  get isElectron() {
    return this._isElectron;
  }

  static getInstance(): DataService {
    if ( DataService._instance ) {
      return DataService._instance;
    }
    return DataService._instance = new DataService();
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

    this.ipc.addBluetoothListener((_, args) => {
      this.emitter.emit('bluetooth', ...args);
    });

    this.ipc.addExternalConnector((_, args) => {
      if (!Array.isArray(args)) return;
      if (args.length != 4) return;

      if ( args[3].type === '__timer_list' ) {
        let data: { 0: any, 1: ExternalTimer}[] = args[3].value;
        this.externalTimers.set( data.map((e: any) => e[1]) );
        return;
      }

      this.emitter.emit('external', args);
    });
  }

  on(ev: DataEvent, cb: (...args: any[]) => any) {
    this.emitter.on(ev, cb);
  }

  off(ev: DataEvent, cb: (...args: any[]) => any) {
    this.emitter.off(ev, cb);
  }

  emit(ev: string, ...args: any[]) {
    this.emitter.emit(ev, ...args);
  }

  getAlgorithms(path: string, all?: boolean): Promise<Algorithm[]> {
    return this.ipc.getAlgorithms({ all, path });
  }

  getAlgorithm(path: string, shortName: string): Promise<Algorithm | null> {
    return this.ipc.getAlgorithm({ path, shortName });
  }

  addAlgorithm(alg: Algorithm) {
    return this.ipc.addAlgorithm(alg);
  }

  removeAlgorithm(alg: Algorithm) {
    return this.ipc.removeAlgorithm(alg);
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
    let _s = Object.assign({}, s);
    delete _s.icon;
    return this.ipc.addSession(_s);
  }

  removeSession(s: Session) {
    let _s = Object.assign({}, s);
    delete _s.icon;
    return this.ipc.removeSession( extractKey(_s, '_id') as Session );
  }

  renameSession(s: Session) {
    let _s = Object.assign({}, s);
    delete _s.icon;
    return this.ipc.renameSession(_s);
  }

  updateSession(s: Session) {
    let _s = Object.assign({}, s);
    delete _s.icon;
    return this.ipc.updateSession(_s);
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

  cancelUpdate() {
    return this.ipc.cancelUpdate();
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

  clearCache(db: ICacheDB) {
    return this.ipc.clearCache(db);
  }

  getStorageInfo() {
    return this.ipc.getStorageInfo();
  }

  getAllDisplays(): Promise<Display[]> {
    return this.ipc.getAllDisplays();
  }

  useDisplay(id: number): Promise<void> {
    return this.ipc.useDisplay(id);
  }

  emitBluetoothData(type: string, data: any) {
    this.emitter.emit('bluetooth', type, data);
  }

  external(device: string, ...args: any[]) {
    this.ipc.external(device, ...args);
  }

  scramble(s: string) {
    this.emitter.emit<DataEvent>('scramble', s);
  }
}
