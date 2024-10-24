import type { ThemeIPC } from "./themeIPC.interface";

export class ThemeNoopIPC implements ThemeIPC {
  private constructor() {}

  private static _instance: ThemeNoopIPC | null = null;

  static getInstance() {
    if (!ThemeNoopIPC._instance) {
      ThemeNoopIPC._instance = new ThemeNoopIPC();
    }

    return ThemeNoopIPC._instance;
  }
}
