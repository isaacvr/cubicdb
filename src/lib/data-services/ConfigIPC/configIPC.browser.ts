import type {
  BluetoothCubeInfo,
  CONFIG,
  ContestPDFOptions,
  ContestPDFResult,
  FONT_NAME,
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
import { dataService } from "$lib/data-services/data.service";
import { get } from "svelte/store";

export class ConfigBrowserIPC implements ConfigIPC {
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
    let config = {} as CONFIG;

    try {
      config = JSON.parse(localStorage.getItem("config") || "{}") as CONFIG;
      config.configMap = JSON.parse(config.configMap || "[]");
    } catch {}

    this.global = {
      theme: config?.global?.theme || DEFAULT_THEME.id,
      lang: config?.global?.lang || "EN",
      zoomFactor: config?.global?.zoomFactor || 100,
      appFont: config?.global?.appFont || "Ubuntu",
      timerFont: config?.global?.timerFont || "Ubuntu",
    };

    this.algorithms = {
      listView: config?.algorithms?.listView || false,
    };

    this.timer = {
      session: config?.timer?.session || "",
      bluetoothCubes: config?.timer?.bluetoothCubes || [],
    };

    this.configMap = new Map(config.configMap);

    this.applyConfig();
  }

  private applyConfig() {
    document.documentElement.style.setProperty("--app-font", this.global.appFont);
    document.documentElement.style.setProperty("--timer-font", this.global.timerFont);
    document.documentElement.style.setProperty("--zoom-factor", "" + this.global.zoomFactor);
  }

  private static _instance: ConfigBrowserIPC | null = null;

  static getInstance() {
    if (!ConfigBrowserIPC._instance) {
      ConfigBrowserIPC._instance = new ConfigBrowserIPC();
    }

    return ConfigBrowserIPC._instance;
  }

  addDownloadProgressListener(cb: any) {}
  addDownloadDoneListener(cb: any) {}
  addBluetoothListener(cb: any) {}

  async minimize() {}
  async maximize() {}
  async close() {}

  async update(cmd: UpdateCommand) {
    return null;
  }

  async cancelUpdate() {
    return false;
  }

  async sleep(s: boolean) {}

  async connectBluetoothDevice(id: string) {}

  async cancelBluetoothRequest() {}

  async pairingBluetoothResponse() {}

  async searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string> {
    const filters = inp.adaptor === "GAN" ? GAN_BLUETOOTH_FILTERS : QIYI_BLUETOOTH_FILTERS;

    return new Promise((res, rej) => {
      navigator.bluetooth
        .requestDevice(filters)
        .then(async device => {
          const mac = prompt("MAC:");

          const type = inp.adaptor === "GAN" ? "GAN" : "QYTimer";
          const config = get(dataService).config;

          config.setPath(`timer/inputs/${type}`, { mac });
          config.saveConfig();

          inp.fromDevice(device).then(res).catch(rej);

          // if (!device.watchAdvertisements) {
          //   let mac = prompt("");
          //   inp.fromDevice(device).then(res).catch(rej);
          //   return;
          // }

          // console.log("DEVICE: ", device);

          // const abortController = new AbortController();

          // device.onadvertisementreceived = ev => {
          //   console.log("[advertisementreceived]: ", ev);
          //   abortController.abort();
          //   // inp.fromDevice(device).then(res).catch(rej);
          //   rej();
          // };

          // device.watchAdvertisements({ signal: abortController.signal });
        })
        .catch(rej);
    });

    return "";
  }

  async getAllDisplays() {
    return [];
  }

  async useDisplay(id: number) {}

  addExternalConnector(cb: any) {}

  external(device: string, ...args: any[]) {}

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

    localStorage.setItem("config", JSON.stringify(config));
  }

  async generateContestPDF(args: ContestPDFOptions): Promise<ContestPDFResult> {
    return {
      buffer: Buffer.from([]),
      mode: "",
      name: "",
      round: 0,
    };
  }

  async zipPDF(s: { name: string; files: Sheet[] }): Promise<string> {
    return "";
  }

  async revealFile(f: string): Promise<void> {}
}
