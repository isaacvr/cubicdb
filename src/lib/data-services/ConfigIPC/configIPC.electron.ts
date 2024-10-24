import type { IPC, IStorageInfo, UpdateCommand } from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import { type GANInput, BLUETOOTH_FILTERS as GAN_BLUETOOTH_FILTERS } from "$lib/timer/adaptors/GAN";
import {
  type QiYiSmartTimerInput,
  BLUETOOTH_FILTERS as QIYI_BLUETOOTH_FILTERS,
} from "$lib/timer/adaptors/QY-Timer";

export class ConfigElectronIPC implements ConfigIPC {
  ipc: IPC;

  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: ConfigElectronIPC | null = null;

  static getInstance() {
    if (!ConfigElectronIPC._instance) {
      ConfigElectronIPC._instance = new ConfigElectronIPC();
    }

    return ConfigElectronIPC._instance;
  }

  addDownloadProgressListener(cb: any) {
    this.ipc.addDownloadProgressListener(cb);
  }

  addDownloadDoneListener(cb: any) {
    this.ipc.addDownloadDoneListener(cb);
  }

  addBluetoothListener(cb: any) {
    this.ipc.addBluetoothListener(cb);
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
    return this.ipc.connectBluetoothDevice(id);
  }

  cancelBluetoothRequest() {
    return this.ipc.cancelBluetoothRequest();
  }

  pairingBluetoothResponse() {
    return this.ipc.pairingBluetoothResponse();
  }

  searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string> {
    let filters = inp.adaptor === "GAN" ? GAN_BLUETOOTH_FILTERS : QIYI_BLUETOOTH_FILTERS;

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

  async getStorageInfo(): Promise<IStorageInfo> {
    let algorithms = await this.ipc.algorithmsStorage();
    let cache = await this.ipc.cacheStorage();
    let vcache = await this.ipc.vCacheStorage();
    let sessions = await this.ipc.sessionsStorage();
    let solves = await this.ipc.solvesStorage();
    let tutorials = await this.ipc.tutorialsStorage();
    let reconstructions = await this.ipc.reconstructionsStorage();

    return {
      algorithms,
      cache,
      vcache,
      sessions,
      solves,
      tutorials,
      reconstructions,
    };
  }

  getAllDisplays() {
    return this.ipc.getAllDisplays();
  }

  useDisplay(id: number) {
    return this.ipc.useDisplay(id);
  }

  addExternalConnector(cb: any) {
    this.ipc.addExternalConnector(cb);
  }

  external(device: string, ...args: any[]) {
    this.ipc.external(device, ...args);
  }
}
