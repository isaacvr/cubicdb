import { acycle, gSolver } from "@cstimer/lib/mathlib";
import { adjustScramble, appendSuffix } from "./utils";
import { ScrambleParser } from "@classes/scramble-parser";

export function pyraminxSolver(scramble: string): string[][] {
  let curScramble: ReturnType<typeof ScrambleParser.parsePyraminx>;
  const curScrambleStrArr: string[] = [];
  let sol: any[] = [];

  function stateInit(doMove: Function, state: string) {
    for (let i = 0; i < curScrambleStrArr.length; i += 1) {
      state = doMove(state, curScrambleStrArr[i]);
    }

    for (let i = 0; i < sol.length; i++) {
      state = doMove(state, sol[i]);
    }

    return state;
  }

  const F0 = 0,
    F1 = 1,
    F2 = 2,
    F3 = 3,
    F4 = 4,
    F5 = 5,
    R0 = 6,
    R1 = 7,
    R2 = 8,
    R3 = 9,
    R4 = 10,
    R5 = 11,
    L0 = 12,
    L1 = 13,
    L2 = 14,
    L3 = 15,
    L4 = 16,
    L5 = 17,
    D0 = 18,
    D1 = 19,
    D2 = 20,
    D3 = 21,
    D4 = 22,
    D5 = 23;
  /*
      L F R
        D
      x504x x x504x
       132 231 132
        x x405x x
  
          x504x
           132
            x  */
  const moveData = [
    [
      [F5, R3, D4],
      [F0, R1, D2],
      [F1, R2, D0],
    ], //R
    [
      [F3, L4, R5],
      [F1, L2, R0],
      [F2, L0, R1],
    ], //U
    [
      [F4, D5, L3],
      [F2, D0, L1],
      [F0, D1, L2],
    ], //L
    [
      [R4, L5, D3],
      [R2, L0, D1],
      [R0, L1, D2],
    ], //B
  ];

  function pyraMove(state: string, move: string) {
    const ret: any = state.split("");
    const swaps = moveData["RULB".indexOf(move[0])];
    const pow = "? '".indexOf(move[1]);
    for (let i = 0; i < swaps.length; i += 1) {
      acycle(ret, swaps[i], pow);
    }
    return ret.join("");
  }

  const solv = new gSolver(
    ["????FF??RRR??L?L?L?DDDDD"],
    pyraMove,
    appendSuffix(
      {
        R: 0x0,
        U: 0x1,
        L: 0x2,
        B: 0x3,
      },
      " '"
    )
  );

  curScramble = ScrambleParser.parsePyraminx(scramble, "RULBrulb");

  const scr = [];

  for (let i = 0; i < curScramble.length; i += 1) {
    if (curScramble[i][2] == 2) {
      scr.push("RULB".charAt(curScramble[i][0]) + "'  2".charAt(-curScramble[i][1] + 1));
    }
  }

  const faceStr = ["D", "L", "R", "F"];
  const rawMap = "RULB";
  const moveMaps = [
    ["RULB", "LUBR", "BURL"],
    ["URBL", "LRUB", "BRLU"],
    ["RLBU", "ULRB", "BLUR"],
    ["RBUL", "UBLR", "LBRU"],
  ];

  const res: string[][] = [];

  for (let i = 0; i < 4; i += 1) {
    sol = [];
    let sol1;
    out: for (let depth = 0; depth < 99; depth += 1) {
      for (let j = 0; j < 3; j += 1) {
        const moveMap = moveMaps[i][j];

        curScrambleStrArr.length = 0;

        for (let m = 0; m < scr.length; m += 1) {
          curScrambleStrArr.push(rawMap[moveMap.indexOf(scr[m][0])] + scr[m][1]);
        }

        sol1 = solv.search(stateInit(pyraMove, "????FF??RRR??L?L?L?DDDDD"), depth, depth);

        if (!sol1) {
          continue;
        }
        for (let m = 0; m < sol1.length; m += 1) {
          sol1[m] = moveMap[rawMap.indexOf(sol1[m][0])] + sol1[m][1];
        }
        break out;
      }
    }

    if (sol1) {
      res.push([faceStr[i], adjustScramble(sol1)]);
    } else {
      res.push([faceStr[i], "-"]);
    }
  }

  return res;
}
