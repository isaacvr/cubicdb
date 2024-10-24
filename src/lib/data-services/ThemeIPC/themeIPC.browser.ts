import type { ThemeIPC } from "./themeIPC.interface";

export class ThemeBrowserIPC implements ThemeIPC {
  private constructor() {}

  private static _instance: ThemeBrowserIPC | null = null;

  static getInstance() {
    if (!ThemeBrowserIPC._instance) {
      ThemeBrowserIPC._instance = new ThemeBrowserIPC();
    }

    return ThemeBrowserIPC._instance;
  }
}
