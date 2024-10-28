import { browser } from "$app/environment";
import { CacheBrowserIPC } from "./cacheIPC.browser";
import { CacheElectronIPC } from "./cacheIPC.electron";
import { CacheNoopIPC } from "./cacheIPC.noop";

export function getCacheIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return CacheElectronIPC.getInstance();
    }
    return CacheBrowserIPC.getInstance();
  }

  return CacheNoopIPC.getInstance();
}
