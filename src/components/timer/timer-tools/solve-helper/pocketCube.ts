import { acycle, gSolver } from "@cstimer/lib/mathlib";
import { adjustScramble, appendSuffix } from "./utils";
import { ScrambleParser } from "@classes/scramble-parser";

export function pocketCube(scramble: string): string[][] {
  let faceStr = ["U", "R", "F", "D", "L", "B"];
  let moveData = [
    [
      [0, 1, 3, 2],
      [4, 8, 16, 20],
      [5, 9, 17, 21],
    ], // U
    [
      [4, 5, 7, 6],
      [1, 22, 13, 9],
      [3, 20, 15, 11],
    ], // R
    [
      [8, 9, 11, 10],
      [2, 4, 13, 19],
      [3, 6, 12, 17],
    ], // F
  ];

  function pocketMove(state: string, move: string) {
    let ret: any = state.split("");
    let swaps = moveData["URF".indexOf(move[0])];
    let pow = "? 2'".indexOf(move[1]);
    for (let i = 0; i < swaps.length; i++) {
      acycle(ret, swaps[i], pow);
    }
    return ret.join("");
  }

  let solv = new gSolver(
    [
      "XXXX????????????????????",
      "????XXXX????????????????",
      "????????XXXX????????????",
      "????????????XXXX????????",
      "????????????????XXXX????",
      "????????????????????XXXX",
    ],
    pocketMove,
    appendSuffix({
      U: 1,
      R: 2,
      F: 3,
    })
  );

  let scr = ScrambleParser.parseNNN(scramble, 2, "URF");
  let res: string[][] = [];

  let state = "UUUURRRRFFFFDDDDLLLLBBBB";

  for (let i = 0; i < scr.length; i++) {
    let m = scr[i] as any[];
    
    state = pocketMove(state, "URF".charAt( "URF".indexOf(m[1])) + "'  2".charAt(m[2] + 1));
  }

  for (let face = 0; face < 6; face++) {
    let faceState = [];
    for (let i = 0; i < 24; i++) {
      faceState.push(state[i] == "URFDLB".charAt(face) ? "X" : "?");
    }
    let sol = solv.search(faceState.join(""), 0);

    if (!sol) {
      console.log("SOL FALSE: ", sol);
      continue;
    }

    res.push([faceStr[face], adjustScramble(sol)]);
  }

  return res;
}
