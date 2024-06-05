import { pocketCube } from "./pocketCube";
import { exec333StepSolver } from "./rubiksCube";

export type StepSolver = "222" | "cf" | "roux" | "petrus" | "zz" | "eodr" | "pocket";

export const cubeOris = ["z2", "", "z ", "z'", "x ", "x'"];

for (let i = 0; i < 6; i += 1) {
  for (let j = 0; j < 3; j += 1) {
    cubeOris.push(cubeOris[i] + " y" + " 2'".charAt(j));
  }
}

export const StepSolverStr: { solver: StepSolver; name: string }[] = [
  // 3x3x3
  { solver: "petrus", name: "Petrus 2x2x2 + 2x2x3" },
  { solver: "222", name: "Petrus 2x2x2" },
  { solver: "cf", name: "CFOP" },
  { solver: "roux", name: "Roux B1 + B2" },
  { solver: "zz", name: "ZZ" },
  // { solver: "eodr", name: "EODR" },
  
  // 2x2x2
  { solver: 'pocket', name: '2x2x2' },
];

export function getSolver(type: StepSolver, scramble: string, curOri: string): string[][] {
  const solver333: StepSolver[] = ["222", "cf", "roux", "petrus", "zz", "eodr"];

  if (solver333.some(s => s === type)) {
    return exec333StepSolver(type, scramble, curOri);
  } else if (type === 'pocket') {
    return pocketCube(scramble);
  }

  return [];
}