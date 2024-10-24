import { browser } from "$app/environment";
import { AlgorithmBrowserIPC } from "./algorithmIPC.browser";
import { AlgorithmElectronIPC } from "./algorithmIPC.electron";
import type { AlgorithmIPC } from "./algorithmIPC.interface";
import { AlgorithmNoopIPC } from "./algorithmIPC.noop";

export function getAlgorithmIPC(): AlgorithmIPC {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return AlgorithmElectronIPC.getInstance();
    }
    return AlgorithmBrowserIPC.getInstance();
  }

  return AlgorithmNoopIPC.getInstance();
}
