import type { Algorithm } from "@interfaces";

export interface ReconstructorStep {
  name: string;
  case: Algorithm | null;
  substeps: ReconstructorStep[];
  moveCount: number;
  moves: string[];
  time: number;
  skip: boolean;
  percent: number; // Int percent
  addZ2?: boolean;
}

export interface ReconstructorMethod {
  name: string;
  steps: ReconstructorStep[];
}

export interface IReconstructor {
  getAnalysis: (totalTime: number) => Promise<ReconstructorMethod>;
  feed: (seq: { move: string, time: number }) => void;
}