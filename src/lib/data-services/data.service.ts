import { readable, writable, type Writable } from "svelte/store";
import { getAlgorithmIPC } from "./AlgorithmIPC";
import { getCacheIPC } from "./CacheIPC";
import { getConfigIPC } from "./ConfigIPC";
import { getReconstructionIPC } from "./ReconstructionIPC";
import { getSessionIPC } from "./SessionIPC";
import { getSolveIPC } from "./SolveIPC";
import { getThemeIPC } from "./ThemeIPC";
import { getTutorialIPC } from "./TutorialIPC";
import { Emitter } from "@classes/Emitter";
import { browser } from "$app/environment";

interface ExternalTimer {
  id: string;
  name: string;
}

type DownloadEvent = "download-progress" | "update-downloaded";
type BluetoothEvent = "bluetooth";
type TimerEvent = "scramble";
type ExternalEvent = "external";
type DataEvent = DownloadEvent | BluetoothEvent | TimerEvent | ExternalEvent | (string & {});

const emitter = new Emitter();
const config = getConfigIPC();
const externalTimers: Writable<ExternalTimer[]> = writable([]);

config.addDownloadProgressListener((_: any, progress: number) => {
  emitter.emit("download-progress", progress);
});

config.addDownloadDoneListener(() => {
  emitter.emit("update-downloaded");
});

config.addBluetoothListener((_: any, args: any) => {
  emitter.emit("bluetooth", ...args);
});

config.addExternalConnector((_: any, args: any) => {
  if (!Array.isArray(args)) return;
  if (args.length != 4) return;

  if (args[3].type === "__timer_list") {
    let data: { 0: any; 1: ExternalTimer }[] = args[3].value;
    externalTimers.set(data.map((e: any) => e[1]));
    return;
  }

  emitter.emit("external", args);
});

const dataService = readable({
  // Information
  isElectron: browser && "electronAPI" in window,

  // Handlers
  algorithms: getAlgorithmIPC(),
  cache: getCacheIPC(),
  config,
  reconstruction: getReconstructionIPC(),
  session: getSessionIPC(),
  solve: getSolveIPC(),
  theme: getThemeIPC(),
  tutorial: getTutorialIPC(),

  // Methods
  on(ev: DataEvent, cb: (...args: any[]) => any) {
    emitter.on(ev, cb);
  },

  off(ev: DataEvent, cb: (...args: any[]) => any) {
    emitter.off(ev, cb);
  },

  emit(ev: string, ...args: any[]) {
    emitter.emit(ev, ...args);
  },

  emitBluetoothData(type: string, data: any) {
    emitter.emit("bluetooth", type, data);
  },

  scramble(s: string) {
    emitter.emit<DataEvent>("scramble", s);
  },
});

export { dataService };
