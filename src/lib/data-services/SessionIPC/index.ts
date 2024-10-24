import { browser } from "$app/environment";
import { SessionBrowserIPC } from "./sessionIPC.browser";
import { SessionElectronIPC } from "./sessionIPC.electron";
import { SessionNoopIPC } from "./sessionIPC.noop";

export function getSessionIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return SessionElectronIPC.getInstance();
    }
    return SessionBrowserIPC.getInstance();
  }

  return SessionNoopIPC.getInstance();
}
