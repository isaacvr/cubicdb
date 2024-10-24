import type { UpdateCommand } from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";

interface DATABASE {}

export class ConfigBrowserIPC implements ConfigIPC {
  private constructor() {}

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
}
