import type { IPC, ITutorial } from "@interfaces";
import type { TutorialIPC } from "./tutorialIPC.interface";

export class TutorialElectronIPC implements TutorialIPC {
  ipc: IPC;

  private constructor() {
    this.ipc = (<any>window).electronAPI as IPC;
  }

  private static _instance: TutorialElectronIPC | null = null;

  static getInstance() {
    if (!TutorialElectronIPC._instance) {
      TutorialElectronIPC._instance = new TutorialElectronIPC();
    }

    return TutorialElectronIPC._instance;
  }

  getTutorials() {
    return this.ipc.getTutorials();
  }

  getTutorial(puzzle: string, shortName: string, lang: string) {
    return this.ipc.getTutorial(puzzle, shortName, lang);
  }

  addTutorial(t: ITutorial) {
    return this.ipc.addTutorial(t);
  }

  updateTutorial(t: ITutorial) {
    return this.ipc.updateTutorial(t);
  }

  removeTutorial(t: ITutorial) {
    return this.ipc.removeTutorial(t);
  }

  tutorialsVersion() {
    return this.ipc.tutorialsVersion();
  }

  checkTutorials() {
    return this.ipc.checkTutorials();
  }

  updateTutorials() {
    return this.ipc.updateTutorials();
  }
}
