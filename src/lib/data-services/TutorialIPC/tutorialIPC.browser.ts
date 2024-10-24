import type { ITutorial } from "@interfaces";
import type { TutorialIPC } from "./tutorialIPC.interface";
import { parseDB } from "@helpers/strings";

let tuts: ITutorial[] = [];

async function loadData() {
  const _tuts = await import("$lib/fixed/tutorials.db?raw");
  tuts = parseDB(_tuts.default || "");
}

export class TutorialBrowserIPC implements TutorialIPC {
  private initialized = false;
  private isInit = false;

  private constructor() {}

  private static _instance: TutorialBrowserIPC | null = null;

  static getInstance() {
    if (!TutorialBrowserIPC._instance) {
      TutorialBrowserIPC._instance = new TutorialBrowserIPC();
    }

    return TutorialBrowserIPC._instance;
  }

  private async init() {
    if (this.initialized) return;
    if (!this.isInit) {
      this.isInit = true;
    } else {
      await new Promise(res => {
        let itv = setInterval(() => {
          if (!this.isInit) {
            clearInterval(itv);
            res(null);
          }
        }, 50);
      });
      return;
    }

    await loadData();

    this.initialized = true;
    this.isInit = false;
  }

  async getTutorials() {
    await this.init();
    return tuts;
  }

  async getTutorial(_puzzle: string, _shortName: string, _lang: string) {
    await this.init();
    for (let i = 0, maxi = tuts.length; i < maxi; i += 1) {
      let { puzzle, shortName, lang } = tuts[i];
      if (_puzzle === puzzle && _shortName === shortName && _lang === lang) {
        return tuts[i];
      }
    }

    return null;
  }

  async addTutorial(t: ITutorial) {
    return t;
  }

  async updateTutorial(t: ITutorial) {
    return t;
  }

  async removeTutorial(t: ITutorial) {
    return t;
  }

  async tutorialsVersion() {
    return { version: "0.0.0", minVersion: "0.0.0" };
  }

  async checkTutorials() {
    return { version: "0.0.0", minVersion: "0.0.0" };
  }

  async updateTutorials() {
    return false;
  }
}
