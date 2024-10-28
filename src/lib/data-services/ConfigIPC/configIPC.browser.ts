import type {
  BluetoothCubeInfo,
  CONFIG,
  FONT_NAME,
  LanguageCode,
  UpdateCommand,
} from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
import { DEFAULT_THEME } from "$lib/themes/default";

interface DATABASE {}

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

  private constructor() {
    let config = {} as CONFIG;

    try {
      config = JSON.parse(localStorage.getItem("config") || "{}") as CONFIG;
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
    return "";
  }

  async getAllDisplays() {
    return [];
  }

  async useDisplay(id: number) {}

  addExternalConnector(cb: any) {}

  external(device: string, ...args: any[]) {}

  async saveConfig() {
    const config: CONFIG = {
      global: this.global,
      algorithms: this.algorithms,
      timer: this.timer,
    };

    this.applyConfig();

    localStorage.setItem("config", JSON.stringify(config));
  }
}
