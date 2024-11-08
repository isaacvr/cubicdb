import { PYRA, R222, R333, SKWB, SQR1 } from "@constants";
import { pocketCube } from "./pocketCube";
import { pyraminxSolver } from "./pyraminxSolver";
import { exec333StepSolver } from "./rubiksCube";
import { skewbSolver } from "./skewb";
import { square1Solver } from "./square1";

export type StepSolver =
  | "222"
  | "223"
  | "cf"
  | "roux"
  | "petrus"
  | "zz"
  | "eodr"
  | "pocket"
  | "sq1"
  | "skewb"
  | "pyra";

export const cubeOris = ["z2", "", "z ", "z'", "x ", "x'"];

for (let i = 0; i < 6; i += 1) {
  for (let j = 0; j < 3; j += 1) {
    cubeOris.push(cubeOris[i] + " y" + " 2'".charAt(j));
  }
}

export const StepSolverStr: { solver: StepSolver; name: string; modes: string[] }[] = [
  // 3x3x3
  { solver: "petrus", name: "Petrus 2x2x2 + 2x2x3", modes: R333 },
  { solver: "222", name: "Petrus 2x2x2", modes: R333 },
  { solver: "223", name: "Petrus 2x2x3", modes: R333 },
  { solver: "cf", name: "CFOP", modes: R333 },
  { solver: "roux", name: "Roux B1 + B2", modes: R333 },
  { solver: "zz", name: "ZZ", modes: R333 },
  // { solver: "eodr", name: "EODR", modes: R333 },

  // 2x2x2
  { solver: "pocket", name: "2x2x2", modes: R222 },

  // Skewb
  { solver: "skewb", name: "Skewb", modes: SKWB },

  // Pyraminx
  { solver: "pyra", name: "Pyraminx V", modes: PYRA },

  // Square-1
  { solver: "sq1", name: "Square-1", modes: SQR1 },
];

export function getSolver(
  type: StepSolver,
  scramble: string,
  curOri: string,
  mode: string,
  p223: number
): string[][] | null {
  const solver333: StepSolver[] = ["222", "223", "cf", "roux", "petrus", "zz", "eodr"];

  let stp = StepSolverStr.find(step => step.solver === type);

  if (!stp || stp.modes.indexOf(mode) < 0) return null;

  if (solver333.some(s => s === type)) {
    return exec333StepSolver(type, scramble, curOri, p223);
  } else if (type === "pocket") {
    return pocketCube(scramble);
  } else if (type === "sq1") {
    return square1Solver(scramble);
  } else if (type === "skewb") {
    return skewbSolver(scramble);
  } else if (type === "pyra") {
    return pyraminxSolver(scramble);
  }

  return [];
}
