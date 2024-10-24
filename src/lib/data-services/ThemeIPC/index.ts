import { browser } from "$app/environment";
import { ThemeBrowserIPC } from "./themeIPC.browser";
import { ThemeElectronIPC } from "./themeIPC.electron";
import { ThemeNoopIPC } from "./themeIPC.noop";

export function getThemeIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return ThemeElectronIPC.getInstance();
    }
    return ThemeBrowserIPC.getInstance();
  }

  return ThemeNoopIPC.getInstance();
}
