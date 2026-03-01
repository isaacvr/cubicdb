import type { ITutorial } from "@interfaces";

/**
 * Port for Tutorial repository operations
 * Implement this interface in adapters (IndexedDB, Electron, etc)
 */
export interface ITutorialRepository {
  getTutorials(path: string): Promise<ITutorial[]>;
  getTutorial(path: string, shortName: string): Promise<ITutorial | null>;
  addTutorial(tutorial: ITutorial): Promise<ITutorial>;
  updateTutorial(tutorial: ITutorial): Promise<ITutorial>;
  removeTutorial(tutorial: ITutorial): Promise<ITutorial>;
  removeTutorials?(tutorials: ITutorial[]): Promise<ITutorial[]>;
}
