import type {
  BluetoothCubeInfo,
  CONFIG,
  ContestPDFOptions,
  ContestPDFResult,
  FONT_NAME,
  IPC,
  IStorageInfo,
  LanguageCode,
  Sheet,
  UpdateCommand,
} from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import { type GANInput, BLUETOOTH_FILTERS as GAN_BLUETOOTH_FILTERS } from "$lib/timer/adaptors/GAN";
import {
  type QiYiSmartTimerInput,
  BLUETOOTH_FILTERS as QIYI_BLUETOOTH_FILTERS,
} from "$lib/timer/adaptors/QY-Timer";
import { DEFAULT_THEME } from "$lib/themes/default";
import { applyThemeByID } from "$lib/themes/manageThemes";

export class ConfigElectronIPC implements ConfigIPC {
  ipc: IPC;
  global: {
    theme: string;
    lang: LanguageCode;
    zoomFactor: number;
    appFont: FONT_NAME;
    timerFont: FONT_NAME;
  };
  algorithms: { listView: boolean };
  timer: { session: string; bluetoothCubes: BluetoothCubeInfo[] };
  configMap: Map<string, Record<string, any>>;

  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
    this.global = {
      theme: DEFAULT_THEME.meta.id,
      lang: "EN",
      zoomFactor: 100,
      appFont: "Ubuntu",
      timerFont: "Ubuntu",
    };

    this.algorithms = {
      listView: false,
    };

    this.timer = {
      session: "",
      bluetoothCubes: [],
    };

    this.configMap = new Map();

    this.ipc.getConfig().then(config => {
      this.loadConfig(config);
    });
  }

  private static _instance: ConfigElectronIPC | null = null;

  static getInstance() {
    if (!ConfigElectronIPC._instance) {
      ConfigElectronIPC._instance = new ConfigElectronIPC();
    }

    return ConfigElectronIPC._instance;
  }

  private applyConfig() {
    document.documentElement.style.setProperty("--app-font", this.global.appFont);
    document.documentElement.style.setProperty("--timer-font", this.global.timerFont);
    document.documentElement.style.setProperty("--zoom-factor", "" + this.global.zoomFactor);
    applyThemeByID(this.global.theme);
  }

  private loadConfig(c: CONFIG) {
    this.global = {
      theme: c?.global?.theme || DEFAULT_THEME.meta.id,
      lang: c?.global?.lang || "EN",
      zoomFactor: c?.global?.zoomFactor || 100,
      appFont: c?.global?.appFont || "Ubuntu",
      timerFont: c?.global?.timerFont || "Ubuntu",
    };

    this.algorithms = {
      listView: c?.algorithms?.listView || false,
    };

    this.timer = {
      session: c?.timer?.session || "",
      bluetoothCubes: c?.timer?.bluetoothCubes || [],
    };

    this.configMap = new Map(c?.configMap || []);

    this.applyConfig();
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
    const filters = inp.adaptor === "GAN" ? GAN_BLUETOOTH_FILTERS : QIYI_BLUETOOTH_FILTERS;

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
    const algorithms = await this.ipc.algorithmsStorage();
    const cache = await this.ipc.cacheStorage();
    const vcache = await this.ipc.vCacheStorage();
    const sessions = await this.ipc.sessionsStorage();
    const solves = await this.ipc.solvesStorage();
    const tutorials = await this.ipc.tutorialsStorage();
    const reconstructions = await this.ipc.reconstructionsStorage();

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

  setPath(path: string, config: object) {
    this.configMap.set(path, config);
  }

  getPath(path: string) {
    return this.configMap.get(path) || null;
  }

  async saveConfig() {
    const config: CONFIG = {
      global: this.global,
      algorithms: this.algorithms,
      timer: this.timer,
      configMap: [...this.configMap],
    };

    this.applyConfig();

    this.ipc.saveConfig(config);
  }

  async generateContestPDF(args: ContestPDFOptions): Promise<ContestPDFResult> {
    return this.ipc.generateContestPDF(args);
  }

  async zipPDF(s: { name: string; files: Sheet[] }): Promise<string> {
    return this.ipc.zipPDF(s);
  }

  async revealFile(f: string): Promise<void> {
    return this.ipc.revealFile(f);
  }
}
