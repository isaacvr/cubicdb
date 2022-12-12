import { acycle, get8Perm, getNParity, rn, set8Perm, Solver } from "../lib/mathlib";
import { regScrambler } from './scramble';

let solv = new Solver(4, 1, [[0, doMove, 384]]);
let movePieces = [
  [0, 1],
  [2, 3],
  [0, 3],
  [1, 2]
];

function doMove(idx, m) {
  let arr = set8Perm([], idx >> 4, 4);
  acycle(arr, movePieces[m]);
  return (get8Perm(arr, 4) << 4) + ((idx & 15) ^ (1 << m));
}

function generateScramble() {
  let c = 1 + rn(191);
  c = c * 2 + ((getNParity(c >> 3, 4) ^ (c >> 1) ^ (c >> 2) ^ c) & 1);
  return solv.toStr(solv.search([c], 0), "RLFB", [""]);
}

regScrambler('133', generateScramble);