import type { PuzzleType } from "@interfaces";

export interface PuzzleInfo {
  code: string;
  name: string;
  constr: Function;
  order: boolean;
}

export const puzzleReg: Map<string, PuzzleInfo> = new Map<string, PuzzleInfo>();

export function registerPuzzle(code: PuzzleType, name: string, constr: Function, order: boolean) {
  puzzleReg.set(code, { code, name, constr, order });
}
