import { DEFAULT_THEME } from "$lib/themes/default";
// import { applyTheme, transformTheme } from "$lib/themes/manageThemes";
import { applyTheme } from "$lib/themes/manageThemes";
import { getConfigIPC } from "../ConfigIPC";
import type { ThemeIPC } from "./themeIPC.interface";
import type { Theme } from "@interfaces";

export class ThemeElectronIPC implements ThemeIPC {
  currentTheme = DEFAULT_THEME;

  private constructor() {
    // this.currentTheme = transformTheme(DEFAULT_THEME);
    // applyTheme(this.currentTheme, false);
  }

  private static _instance: ThemeElectronIPC | null = null;

  static getInstance() {
    if (!ThemeElectronIPC._instance) {
      ThemeElectronIPC._instance = new ThemeElectronIPC();
    }

    return ThemeElectronIPC._instance;
  }

  applyTheme(t: Theme, save = true) {
    this.currentTheme = t;
    applyTheme(t);

    if (!save) return;

    const configIPC = getConfigIPC();
    configIPC.global.theme = t.meta.id;
    configIPC.saveConfig();
  }

  getTheme() {
    return this.currentTheme;
  }
}
