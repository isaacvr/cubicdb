import { ScrambleParser } from "@classes/scramble-parser";
import { CubieCube, Solver, circle } from "@cstimer/lib/mathlib";
import { adjustScramble } from "./utils";

export function roux_s1(scramble: string): string[][] {
  const cc = new CubieCube();
  const cd = new CubieCube();

  function cMove(idx: number, m: number) {
    cc.ca = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 1; i < 3; i += 1) {
      const val = idx % 24;
      idx = ~~(idx / 24);
      cc.ca[val & 0x7] = i | (val & 0x18);
    }

    CubieCube.CornMult(cc, CubieCube.moveCube[m * 3], cd);

    const ret = [];

    for (let i = 0; i < 8; i += 1) {
      ret[cd.ca[i] & 0x7] = i | (cd.ca[i] & 0x18);
    }

    idx = 0;

    for (let i = 2; i > 0; i -= 1) {
      idx = idx * 24 + ret[i];
    }

    return idx;
  }

  function eMove(idx: number, m: number) {
    cc.ea = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 1; i < 4; i += 1) {
      const val = idx % 24;
      idx = ~~(idx / 24);
      cc.ea[val >> 1] = (i << 1) | (val & 1);
    }

    CubieCube.EdgeMult(cc, CubieCube.moveCube[m * 3], cd);

    const ret = [];

    for (let i = 0; i < 12; i += 1) {
      ret[cd.ea[i] >> 1] = (i << 1) | (cd.ea[i] & 1);
    }

    idx = 0;

    for (let i = 3; i > 0; i -= 1) {
      idx = idx * 24 + ret[i];
    }

    return idx;
  }

  const SOLVED_CORN = 5 * 24 + 6;
  const SOLVED_EDGE = 20 * 24 * 24 + 18 * 24 + 12;

  const solv = new Solver(6, 3, [
    [SOLVED_CORN, cMove, 24 * 24],
    [SOLVED_EDGE, eMove, 24 * 24 * 24],
  ]);

  const faceStr = ["LU", "LD", "FU", "FD"];
  const moveIdx = ["DRBULF", "URFDLB", "DBLUFR", "UBRDFL"];
  const rotIdx = ["", "", "y", "y"];

  function solveRoux1Ori(solvOri: string) {
    const corn = [SOLVED_CORN];
    const edge = [SOLVED_EDGE];

    for (let i = 1; i < 4; i += 1) {
      corn[i] = cMove(corn[i - 1], 4);
      edge[i] = eMove(edge[i - 1], 4);
    }

    const moveConj = [];

    const _solvOri = solvOri.split("");

    for (let s = 0; s < 4; s += 1) {
      moveConj[s] = _solvOri.join("");

      const moves = ScrambleParser.parseScrambleOld(
        scramble,
        {
          a: 3,
          b: 3,
          c: 3,
        },
        moveConj[s]
      );

      for (let i = 0; i < moves.length; i += 1) {
        const m = moves[i].pos;
        const p = moves[i].times;

        for (let j = 0; j < p; j += 1) {
          corn[s] = cMove(corn[s], m);
          edge[s] = eMove(edge[s], m);
        }
      }
      circle(_solvOri, 0, 2, 3, 5);
    }

    let sol: any = null;

    for (let maxl = 1; maxl < 12; maxl += 1) {
      for (let s = 0; s < 4; s += 1) {
        sol = solv.search([corn[s], edge[s]], maxl == 1 ? 0 : maxl, maxl);
        if (sol) {
          sol.push(s);
          return sol;
        }
      }
    }
  }

  const res: string[][] = [];

  for (let face = 0; face < 4; face += 1) {
    const sol = solveRoux1Ori(moveIdx[face]);
    let ori = sol.pop();

    if (face % 2 == 0) {
      ori = (ori + 2) % 4;
    }

    for (let i = 0; i < sol.length; i += 1) {
      sol[i] = "URFDLB".charAt(sol[i][0]) + " 2'".charAt(sol[i][1]);
    }

    res.push([
      faceStr[face],
      [rotIdx[face], ["", "x'", "x2", "x"][ori], adjustScramble(sol)].join(" ").trim(),
    ]);
  }

  return res;
}
