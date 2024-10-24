import type { ITutorial } from "@interfaces";
import type { TutorialIPC } from "./tutorialIPC.interface";

export class TutorialNoopIPC implements TutorialIPC {
  private constructor() {}

  private static _instance: TutorialNoopIPC | null = null;

  static getInstance() {
    if (!TutorialNoopIPC._instance) {
      TutorialNoopIPC._instance = new TutorialNoopIPC();
    }

    return TutorialNoopIPC._instance;
  }

  async getTutorials() {
    return [];
  }

  async getTutorial(puzzle: string, shortName: string, lang: string) {
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
