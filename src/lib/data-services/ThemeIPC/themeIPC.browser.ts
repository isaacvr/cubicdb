import type { Theme } from "@interfaces";
import type { ThemeIPC } from "./themeIPC.interface";
import { DEFAULT_THEME } from "$lib/themes/default";
import { applyTheme } from "$lib/themes/manageThemes";
import { getConfigIPC } from "../ConfigIPC";

export class ThemeBrowserIPC implements ThemeIPC {
  currentTheme = DEFAULT_THEME;

  private constructor() {}

  private static _instance: ThemeBrowserIPC | null = null;

  static getInstance() {
    if (!ThemeBrowserIPC._instance) {
      ThemeBrowserIPC._instance = new ThemeBrowserIPC();
    }

    return ThemeBrowserIPC._instance;
  }

  applyTheme(t: Theme, save = true) {
    this.currentTheme = t;
    applyTheme(t);

    if (!save) return;

    const configIPC = getConfigIPC();
    configIPC.global.theme = t.id;
    configIPC.saveConfig();
  }

  getTheme() {
    return this.currentTheme;
  }
}
