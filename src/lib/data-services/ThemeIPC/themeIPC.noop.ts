import type { Theme } from "@interfaces";
import type { ThemeIPC } from "./themeIPC.interface";
import { DEFAULT_THEME } from "$lib/themes/default";

export class ThemeNoopIPC implements ThemeIPC {
  currentTheme = DEFAULT_THEME;
  private constructor() {}

  private static _instance: ThemeNoopIPC | null = null;

  static getInstance() {
    if (!ThemeNoopIPC._instance) {
      ThemeNoopIPC._instance = new ThemeNoopIPC();
    }

    return ThemeNoopIPC._instance;
  }

  applyTheme(t: Theme) {}

  getTheme() {
    return this.currentTheme;
  }
}
