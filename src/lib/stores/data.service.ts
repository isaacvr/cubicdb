/// <reference types="web-bluetooth" />

import { Emitter } from "@classes/Emitter";
import { BLUETOOTH_FILTERS as GAN_BLUETOOTH_FILTERS, type GANInput } from "$lib/timer/adaptors/GAN";
import {
  BLUETOOTH_FILTERS as QIYI_BLUETOOTH_FILTERS,
  type QiYiSmartTimerInput,
} from "$lib/timer/adaptors/QY-Timer";
import type {
  Algorithm,
  Solve,
  Session,
  ITutorial,
  Sheet,
  CubeEvent,
  IPC,
  ContestPDFOptions,
  UpdateCommand,
  PDFOptions,
  ICacheDB,
  IDBReconstruction,
} from "@interfaces";
import { ElectronAdaptor, IndexedDBAdaptor } from "@storage/index";
import type { Display } from "electron";
import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import { NoopAdaptor } from "@storage/noop";

type DownloadEvent = "download-progress" | "update-downloaded";
type BluetoothEvent = "bluetooth";
type TimerEvent = "scramble";
type ExternalEvent = "external";
type DataEvent = DownloadEvent | BluetoothEvent | TimerEvent | ExternalEvent | (string & {});

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
    this._isElectron = false;

    if (browser) {
      // @ts-ignore
      if (window.electronAPI) {
        this.ipc = new ElectronAdaptor();
        this._isElectron = true;
      } else {
        this.ipc = new IndexedDBAdaptor();
      }
    } else {
      this.ipc = new NoopAdaptor();
    }

    this.setIpc();
  }

  get isElectron() {
    return this._isElectron;
  }

  static getInstance(): DataService {
    if (DataService._instance) {
      return DataService._instance;
    }
    return (DataService._instance = new DataService());
  }

  setIpc() {
    this.ipc.addDownloadProgressListener((_, progress: number) => {
      this.emitter.emit("download-progress", progress);
    });

    this.ipc.addDownloadDoneListener(() => {
      this.emitter.emit("update-downloaded");
    });

    this.ipc.addBluetoothListener((_, args) => {
      this.emitter.emit("bluetooth", ...args);
    });

    this.ipc.addExternalConnector((_, args) => {
      if (!Array.isArray(args)) return;
      if (args.length != 4) return;

      if (args[3].type === "__timer_list") {
        let data: { 0: any; 1: ExternalTimer }[] = args[3].value;
        this.externalTimers.set(data.map((e: any) => e[1]));
        return;
      }

      this.emitter.emit("external", args);
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

  algorithmsVersion() {
    return this.ipc.algorithmsVersion();
  }

  checkAlgorithms() {
    return this.ipc.checkAlgorithms();
  }

  updateAlgorithms() {
    return this.ipc.updateAlgorithms();
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

  updateTutorials() {
    return this.ipc.updateTutorials();
  }

  tutorialsVersion() {
    return this.ipc.tutorialsVersion();
  }

  checkTutorials() {
    return this.ipc.checkTutorials();
  }

  addReconstruction(rec: IDBReconstruction) {
    return this.ipc.addReconstruction(rec);
  }

  getReconstructions() {
    return this.ipc.getReconstructions();
  }

  updateReconstructions() {
    return this.ipc.updateReconstructions();
  }

  reconstructionsVersion() {
    return this.ipc.reconstructionsVersion();
  }

  checkReconstructions() {
    return this.ipc.checkReconstructions();
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
    return this.ipc.addSolves(
      s.map(sv => {
        let ts: Solve = Object.assign({}, sv);
        delete ts._id;

        return ts;
      })
    );
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
    return this.ipc.removeSession(extractKey(_s, "_id") as Session);
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

  zipPDF(s: { name: string; files: Sheet[] }) {
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
    localStorage.setItem("bluetooth-mac", id);
    return this.ipc.connectBluetoothDevice(id);
  }

  cancelBluetoothRequest() {
    localStorage.removeItem("bluetooth-mac");
    return this.ipc.cancelBluetoothRequest();
  }

  pairingBluetoothResponse() {
    return this.ipc.pairingBluetoothResponse();
  }

  searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string> {
    let filters = inp.adaptor === "GAN" ? GAN_BLUETOOTH_FILTERS : QIYI_BLUETOOTH_FILTERS;

    console.log("searchBluetooth");

    return new Promise((res, rej) => {
      navigator.bluetooth
        .requestDevice(filters)
        .then(async device => {
          device.addEventListener("advertisementreceived", ev =>
            console.log("[advertisementreceived]: ", ev)
          );

          device.addEventListener("gattserverdisconnected", ev =>
            console.log("[gattserverdisconnected]: ", ev)
          );

          inp.fromDevice(device).then(res).catch(rej);
        })
        .catch(rej);
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

  cacheGetVideo(hash: string): Promise<ArrayBuffer | null> {
    return this.ipc.cacheGetVideo(hash);
  }

  cacheSaveImage(hash: string, data: string): Promise<void> {
    return this.ipc.cacheSaveImage(hash, data);
  }

  cacheSaveVideo(hash: string, data: ArrayBuffer): Promise<void> {
    return this.ipc.cacheSaveVideo(hash, data);
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
    this.emitter.emit("bluetooth", type, data);
  }

  external(device: string, ...args: any[]) {
    this.ipc.external(device, ...args);
  }

  scramble(s: string) {
    this.emitter.emit<DataEvent>("scramble", s);
  }
}
