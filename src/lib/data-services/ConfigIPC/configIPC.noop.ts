import type { BluetoothCubeInfo, FONT_NAME, LanguageCode, UpdateCommand } from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
import { DEFAULT_THEME } from "$lib/themes/default";

export class ConfigNoopIPC implements ConfigIPC {
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
    this.global = {
      lang: "EN",
      theme: DEFAULT_THEME.id,
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
  }

  private static _instance: ConfigNoopIPC | null = null;

  static getInstance() {
    if (!ConfigNoopIPC._instance) {
      ConfigNoopIPC._instance = new ConfigNoopIPC();
    }

    return ConfigNoopIPC._instance;
  }

  addDownloadProgressListener(cb: any) {}

  addDownloadDoneListener(cb: any) {}

  addBluetoothListener(cb: any) {}

  async searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string> {
    return "";
  }

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

  async getAllDisplays() {
    return [];
  }

  async useDisplay(id: number) {}

  async saveConfig() {}

  addExternalConnector(cb: any) {}

  external(device: string, ...args: any[]) {}
}
