import type { GANInput } from "$lib/timer/adaptors/GAN";
import type { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
import type {
  AnyCallback,
  CONFIG,
  ContestPDFOptions,
  ContestPDFResult,
  Sheet,
  UpdateCommand,
} from "@interfaces";
import type { Display } from "electron";

export interface ConfigIPC extends CONFIG {
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
  saveConfig: () => Promise<void>;
  setPath: (path: string, config: Record<string, any>) => any;
  getPath: (path: string) => Record<string, any> | null;
  generateContestPDF: (args: ContestPDFOptions) => Promise<ContestPDFResult>;
  zipPDF: (s: { name: string; files: Sheet[] }) => Promise<string>;
  revealFile: (f: string) => Promise<void>;
  // openFile: (f: string) => Promise<void>;
}
