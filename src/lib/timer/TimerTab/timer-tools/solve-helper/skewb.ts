import { ScrambleParser } from "@classes/scramble-parser";
import { acycle, gSolver } from "@cstimer/lib/mathlib";
import { adjustScramble, appendSuffix } from "./utils";

export function skewbSolver(scramble: string): string[][] {
  let curScramble: ReturnType<typeof ScrambleParser.parseSkewb>;
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

  const U0 = 0,
    U1 = 1,
    U2 = 2,
    U3 = 3,
    U4 = 4,
    R0 = 5,
    R1 = 6,
    R2 = 7,
    R3 = 8,
    R4 = 9,
    F0 = 10,
    F1 = 11,
    F2 = 12,
    F3 = 13,
    F4 = 14,
    D0 = 15,
    D1 = 16,
    D2 = 17,
    D3 = 18,
    D4 = 19,
    L0 = 20,
    L1 = 21,
    L2 = 22,
    L3 = 23,
    L4 = 24,
    B0 = 25,
    B1 = 26,
    B2 = 27,
    B3 = 28,
    B4 = 29;
  /**	1 2   U
			 0  LFRB
			3 4   D  */
  const moveData = [
    [
      [R0, B0, D0],
      [R4, B3, D2],
      [R2, B4, D1],
      [R3, B1, D4],
      [L3, F4, U4],
    ], //R
    [
      [U0, L0, B0],
      [U2, L1, B2],
      [U4, L2, B4],
      [U1, L3, B1],
      [D4, R2, F1],
    ], //U
    [
      [F0, D0, L0],
      [F3, D3, L4],
      [F1, D1, L3],
      [F4, D4, L2],
      [B4, U1, R3],
    ], //L
    [
      [B0, L0, D0],
      [B4, L3, D4],
      [B3, L1, D3],
      [B2, L4, D2],
      [F3, R4, U2],
    ], //B
    [
      [U0, B0, R0],
      [U4, B1, R2],
      [U3, B2, R4],
      [U2, B3, R1],
      [D2, F2, L1],
    ], //r
    [
      [U0, L0, B0],
      [U2, L1, B2],
      [U4, L2, B4],
      [U1, L3, B1],
      [D4, R2, F1],
    ], //b
    [
      [U0, B0, D0, F0],
      [U1, B2, D4, F3],
      [U2, B4, D3, F1],
      [U3, B1, D2, F4],
      [U4, B3, D1, F2],
      [R1, R2, R4, R3],
      [L1, L3, L4, L2],
    ], //x
    [
      [R0, F0, L0, B0],
      [R1, F1, L1, B1],
      [R2, F2, L2, B2],
      [R3, F3, L3, B3],
      [R4, F4, L4, B4],
      [U1, U2, U4, U3],
      [D1, D3, D4, D2],
    ], //y
    [],
  ];

  function skewbMove(state: string, move: string) {
    const ret: any = state.split("");
    const swaps = moveData["RULBrbxy".indexOf(move[0])];
    const pow = "? '*".indexOf(move[1]);
    for (let i = 0; i < swaps.length; i++) {
      acycle(ret, swaps[i], pow);
    }
    return ret.join("");
  }

  const solv = new gSolver(
    [
      "?L?L??B?B?UUUUU?R?R???F?F?????",
      "?F?F??L?L?UUUUU?B?B???R?R?????",
      "?R?R??F?F?UUUUU?L?L???B?B?????",
      "?B?B??R?R?UUUUU?F?F???L?L?????",
    ],
    skewbMove,
    appendSuffix(
      {
        R: 0x0,
        r: 0x1,
        B: 0x2,
        b: 0x3,
      },
      " '"
    )
  );

  curScramble = ScrambleParser.parseSkewb(scramble, "RULB");

  curScrambleStrArr.length = 0;

  for (let i = 0; i < curScramble.length; i++) {
    curScrambleStrArr[i] = "RULB".charAt(curScramble[i][0]) + "'  2".charAt(curScramble[i][1] + 1);
  }

  const faceStr = ["U", "R", "F", "D", "L", "B"];

  const faceSolved = [
    "UUUUU?RR???FF????????LL???BB??",
    "???BBUUUUU??L?L?FF????????R?R?",
    "?B?B??R?R?UUUUU?F?F???L?L?????",
    "????????RR???BBUUUUU???LL???FF",
    "?BB????????R?R????FFUUUUU??L?L",
    "??F?F??R?R???????B?B?L?L?UUUUU",
  ];

  const res: string[][] = [];

  for (let i = 0; i < 6; i++) {
    sol = [];

    const state = stateInit(skewbMove, "U????R????F????D????L????B????");
    const ori = ["x*", "y ", null, "x ", "y*", "y'"];
    const uidx = ~~(state.indexOf(faceStr[i]) / 5);

    if (ori[uidx]) {
      sol.push(ori[uidx]);
    }

    const sol1 = solv.search(stateInit(skewbMove, faceSolved[i]), 0);

    if (sol1) {
      const suff = sol[0] ? sol[0].replace("'", "2").replace("*", "'") : "";

      res.push([faceStr[i], adjustScramble([suff, ...sol1])]);
    } else {
      res.push([faceStr[i], "-"]);
    }
  }

  return res;
}
