import type { ITutorial } from "@interfaces";

export interface TutorialIPC {
  getTutorials: () => Promise<ITutorial[]>;
  getTutorial: (puzzle: string, shortName: string, lang: string) => Promise<ITutorial | null>;
  addTutorial: (t: ITutorial) => Promise<ITutorial>;
  updateTutorial: (t: ITutorial) => Promise<ITutorial>;
  removeTutorial: (t: ITutorial) => Promise<ITutorial>;
  tutorialsVersion: () => Promise<{ version: string; minVersion: string }>;
  checkTutorials: () => Promise<{ version: string; minVersion: string }>;
  updateTutorials: () => Promise<boolean>;
}
