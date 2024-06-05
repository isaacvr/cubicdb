import { pocketCube } from "./pocketCube";
import { exec333StepSolver } from "./rubiksCube";
import { skewbSolver } from "./skewb";
import { square1Solver } from "./square1";

export type StepSolver = "222" | "cf" | "roux" | "petrus" | "zz" | "eodr" | "pocket" | "sq1" | "skewb";

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
  
  // Skewb
  { solver: 'skewb', name: 'Skewb' },
  
  // Square-1
  { solver: 'sq1', name: 'Square-1' },
];

export function getSolver(type: StepSolver, scramble: string, curOri: string): string[][] {
  const solver333: StepSolver[] = ["222", "cf", "roux", "petrus", "zz", "eodr"];

  if (solver333.some(s => s === type)) {
    return exec333StepSolver(type, scramble, curOri);
  } else if (type === 'pocket') {
    return pocketCube(scramble);
  } else if (type === 'sq1') {
    return square1Solver(scramble);
  } else if (type === 'skewb') {
    return skewbSolver(scramble);
  }

  return [];
}