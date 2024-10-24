import { browser } from "$app/environment";
import { SolveBrowserIPC } from "./solveIPC.browser";
import { SolveElectronIPC } from "./solveIPC.electron";
import { SolveNoopIPC } from "./solveIPC.noop";

export function getSolveIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return SolveElectronIPC.getInstance();
    }
    return SolveBrowserIPC.getInstance();
  }

  return SolveNoopIPC.getInstance();
}
