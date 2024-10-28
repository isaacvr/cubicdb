import { browser } from "$app/environment";
import { ConfigBrowserIPC } from "./configIPC.browser";
import { ConfigElectronIPC } from "./configIPC.electron";
import { ConfigNoopIPC } from "./configIPC.noop";

export function getConfigIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return ConfigElectronIPC.getInstance();
    }
    return ConfigBrowserIPC.getInstance();
  }

  return ConfigNoopIPC.getInstance();
}
