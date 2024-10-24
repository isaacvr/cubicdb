import { browser } from "$app/environment";
import { ReconstructionBrowserIPC } from "./reconstructionIPC.browser";
import { ReconstructionElectronIPC } from "./reconstructionIPC.electron";
import { ReconstructionNoopIPC } from "./reconstructionIPC.noop";

export function getReconstructionIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return ReconstructionElectronIPC.getInstance();
    }
    return ReconstructionBrowserIPC.getInstance();
  }

  return ReconstructionNoopIPC.getInstance();
}
