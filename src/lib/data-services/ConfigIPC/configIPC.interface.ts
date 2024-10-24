import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
import type { AnyCallback, UpdateCommand } from "@interfaces";
import type { Display } from "electron";

export interface ConfigIPC {
  addDownloadProgressListener: (cb: (percent: number) => {}) => any;
  addDownloadDoneListener: (cb: () => {}) => any;
  addBluetoothListener: (cb: AnyCallback) => any;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  update: (cmd: UpdateCommand) => Promise<string | null>;
  cancelUpdate: () => Promise<boolean>;
  sleep: (s: boolean) => Promise<void>;
  connectBluetoothDevice: (id: string) => Promise<void>;
  cancelBluetoothRequest: () => Promise<void>;
  pairingBluetoothResponse: () => Promise<void>;
  searchBluetooth(inp: GANInput | QiYiSmartTimerInput): Promise<string>;
  getAllDisplays: () => Promise<Display[]>;
  useDisplay: (id: number) => Promise<void>;
  addExternalConnector: (cb: AnyCallback) => any;
  external: (device: string, ...args: any[]) => any;
}
