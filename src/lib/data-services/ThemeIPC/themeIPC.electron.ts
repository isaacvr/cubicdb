import type { ThemeIPC } from "./themeIPC.interface";

export class ThemeElectronIPC implements ThemeIPC {
  private constructor() {}

  private static _instance: ThemeElectronIPC | null = null;

  static getInstance() {
    if (!ThemeElectronIPC._instance) {
      ThemeElectronIPC._instance = new ThemeElectronIPC();
    }

    return ThemeElectronIPC._instance;
  }
}
