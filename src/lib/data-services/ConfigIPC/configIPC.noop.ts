import type { UpdateCommand } from "@interfaces";
import type { ConfigIPC } from "./configIPC.interface";
import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";

export class ConfigNoopIPC implements ConfigIPC {
  private constructor() {}

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

  addExternalConnector(cb: any) {}

  external(device: string, ...args: any[]) {}
}
