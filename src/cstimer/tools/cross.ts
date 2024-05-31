import { ScrambleParser } from "@classes/scramble-parser";
import {
  createMove,
  createPrun,
  getNPerm,
  setNPerm,
  Cnk,
  edgeMove,
  getPruning,
  rn,
  rndPerm,
  valuedArray,
} from "./../lib/mathlib";
import { solvFacelet } from "@cstimer/scramble/scramble_333";
import { Puzzle } from "@classes/puzzle/puzzle";

let permPrun: number[], flipPrun: number[], ecPrun: number[][], fullPrun: number[];
let cmv: number[][] = [];
let pmul: number[][] = [];
let fmul: number[][] = [];

let e1mv: number[][] = [];
let c1mv: number[][] = [];
let xxPrun01: number[] = [];
let xxPrun02: number[] = [];

function pmv(a: number, c: number) {
  let b = cmv[c][~~(a / 24)];
  return 24 * ~~(b / 384) + pmul[a % 24][(b >> 4) % 24];
}

function fmv(b: number, c: number) {
  let a = cmv[c][b >> 4];
  return (~~(a / 384) << 4) | (fmul[b & 15][(a >> 4) % 24] ^ (a & 15));
}

function i2f(a: number, c: number[]) {
  for (let b = 3; 0 <= b; b--) (c[b] = a & 1), (a >>= 1);
}

function f2i(c: number[]) {
  let a, b;
  for (a = 0, b = 0; 4 > b; b++) (a <<= 1), (a |= c[b]);
  return a;
}

function fullmv(idx: number, move: number) {
  let slice = cmv[move][~~(idx / 384)];
  let flip = fmul[idx & 15][(slice >> 4) % 24] ^ (slice & 15);
  let perm = pmul[(idx >> 4) % 24][(slice >> 4) % 24];
  return ~~(slice / 384) * 384 + 16 * perm + flip;
}

let initRet = false;

function init() {
  if (initRet) {
    return;
  }

  initRet = true;

  for (let i = 0; i < 24; i++) {
    pmul[i] = [];
  }

  for (let i = 0; i < 16; i++) {
    fmul[i] = [];
  }

  let pm1: number[] = [];
  let pm2: number[] = [];
  let pm3: number[] = [];

  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 24; j++) {
      setNPerm(pm1, i, 4);
      setNPerm(pm2, j, 4);

      for (let k = 0; k < 4; k++) {
        pm3[k] = pm1[pm2[k]];
      }

      pmul[i][j] = getNPerm(pm3, 4);

      if (i < 16) {
        i2f(i, pm1);
        for (let k = 0; k < 4; k++) {
          pm3[k] = pm1[pm2[k]];
        }
        fmul[i][j] = f2i(pm3);
      }
    }
  }
  createMove(cmv, 495, getmv);

  permPrun = [];
  flipPrun = [];

  createPrun(permPrun, 0, 11880, 5, pmv);
  createPrun(flipPrun, 0, 7920, 6, fmv);

  function getmv(comb: number, m: number) {
    let arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let r = 4;

    for (let i = 0; i < 12; i++) {
      if (comb >= Cnk[11 - i][r]) {
        comb -= Cnk[11 - i][r--];
        arr[i] = r << 1;
      } else {
        arr[i] = -1;
      }
    }

    edgeMove(arr, m);

    (comb = 0), (r = 4);
    let t = 0;
    let pm = [];

    for (let i = 0; i < 12; i++) {
      if (arr[i] >= 0) {
        comb += Cnk[11 - i][r--];
        pm[r] = arr[i] >> 1;
        t |= (arr[i] & 1) << (3 - r);
      }
    }

    return ((comb * 24 + getNPerm(pm, 4)) << 4) | t;
  }
}

let xxinitRet = false;

function xxinit() {
  if (xxinitRet) return;

  xxinitRet = true;

  xinit();
  let obj1 = 4;
  let obj2 = 5;
  createPrun(
    xxPrun01,
    obj1 * 3 * 24 + obj1 * 2 + 576 * (obj2 * 3 * 24 + obj2 * 2),
    576 * 576,
    7,
    function (q: any, m: any) {
      let ec1 = q % 576;
      let ec2 = ~~(q / 576);
      return (
        c1mv[~~(ec1 / 24)][m] * 24 +
        e1mv[ec1 % 24][m] +
        576 * (c1mv[~~(ec2 / 24)][m] * 24 + e1mv[ec2 % 24][m])
      );
    }
  );
  obj2 = 6;
  createPrun(
    xxPrun02,
    obj1 * 3 * 24 + obj1 * 2 + 576 * (obj2 * 3 * 24 + obj2 * 2),
    576 * 576,
    7,
    function (q: any, m: any) {
      let ec1 = q % 576;
      let ec2 = ~~(q / 576);
      return (
        c1mv[~~(ec1 / 24)][m] * 24 +
        e1mv[ec1 % 24][m] +
        576 * (c1mv[~~(ec2 / 24)][m] * 24 + e1mv[ec2 % 24][m])
      );
    }
  );
}

let xinitRet = false;

function xinit() {
  if (xinitRet) {
    return;
  }

  xinitRet = true;

  init();

  for (let i = 0; i < 24; i++) {
    c1mv[i] = [];
    e1mv[i] = [];
    for (let m = 0; m < 6; m++) {
      c1mv[i][m] = cornMove(i, m);
      let edge = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
      edge[i >> 1] = i & 1;
      edgeMove(edge, m);
      for (let e = 0; e < 12; e++) {
        if (edge[e] >= 0) {
          e1mv[i][m] = (e << 1) | edge[e];
          break;
        }
      }
    }
  }

  ecPrun = [];

  for (let obj = 0; obj < 4; obj++) {
    let prun: number[] = [];

    createPrun(prun, (obj + 4) * 3 * 24 + (obj + 4) * 2, 576, 5, function (q: number, m: number) {
      return c1mv[~~(q / 24)][m] * 24 + e1mv[q % 24][m];
    });

    ecPrun[obj] = prun;
  }

  function cornMove(corn: number, m: number) {
    let idx = ~~(corn / 3);
    let twst = corn % 3;
    let idxt = [
      [3, 1, 2, 7, 0, 5, 6, 4],
      [0, 1, 6, 2, 4, 5, 7, 3],
      [1, 2, 3, 0, 4, 5, 6, 7],
      [0, 5, 1, 3, 4, 6, 2, 7],
      [4, 0, 2, 3, 5, 1, 6, 7],
      [0, 1, 2, 3, 7, 4, 5, 6],
    ];
    let twstt = [
      [2, 0, 0, 1, 1, 0, 0, 2],
      [0, 0, 1, 2, 0, 0, 2, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 2, 0, 0, 2, 1, 0],
      [1, 2, 0, 0, 2, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];
    twst = (twst + twstt[m][idx]) % 3;
    return idxt[m][idx] * 3 + twst;
  }
}

//e4perm, e4flip, e1, c1
//obj: -1:only cross.
//	i-4: end when e==i*2, c==i*3
function idaxxcross(
  q: number,
  t: number,
  e: number[],
  c: number[],
  xxPrun: any,
  l: number,
  lm: number,
  sol: string[]
) {
  if (l == 0) {
    return (
      q == 0 &&
      t == 0 &&
      e[0] == 4 * 2 &&
      c[0] == 4 * 3 &&
      ((e[1] == 5 * 2 && c[1] == 5 * 3) || (e[1] == 6 * 2 && c[1] == 6 * 3))
    );
  } else {
    if (
      getPruning(permPrun, q) > l ||
      getPruning(flipPrun, t) > l ||
      getPruning(xxPrun, c[0] * 24 + e[0] + 576 * (c[1] * 24 + e[1])) > l
    )
      return false;
    let p, s, ex, cx, a, m;
    for (m = 0; m < 6; m++) {
      if (m != lm && m != lm - 3) {
        p = q;
        s = t;
        ex = e;
        cx = c;
        for (a = 0; a < 3; a++) {
          p = pmv(p, m);
          s = fmv(s, m);
          ex = [e1mv[ex[0]][m], e1mv[ex[1]][m]];
          cx = [c1mv[cx[0]][m], c1mv[cx[1]][m]];
          if (idaxxcross(p, s, ex, cx, xxPrun, l - 1, m, sol)) {
            sol.push("FRUBLD".charAt(m) + " 2'".charAt(a));
            return true;
          }
        }
      }
    }
  }
  return false;
}

//e4perm, e4flip, e1, c1
//obj: -1:only cross.
//	i-4: end when e==i*2, c==i*3
function idaxcross(
  q: number,
  t: number,
  e: number,
  c: number,
  obj: number,
  l: number,
  lm: number,
  sol: string[]
) {
  if (l == 0) {
    return q == 0 && t == 0 && e == (obj + 4) * 2 && c == (obj + 4) * 3;
  } else {
    if (
      getPruning(permPrun, q) > l ||
      getPruning(flipPrun, t) > l ||
      getPruning(ecPrun[obj], c * 24 + e) > l
    )
      return false;
    let p, s, ex, cx, a, m;
    for (m = 0; m < 6; m++) {
      if (m != lm && m != lm - 3) {
        p = q;
        s = t;
        ex = e;
        cx = c;
        for (a = 0; a < 3; a++) {
          p = pmv(p, m);
          s = fmv(s, m);
          ex = e1mv[ex][m];
          cx = c1mv[cx][m];
          if (idaxcross(p, s, ex, cx, obj, l - 1, m, sol)) {
            sol.push("FRUBLD".charAt(m) + " 2'".charAt(a));
            return true;
          }
        }
      }
    }
  }
  return false;
}

//e4perm, e4flip
function idacross(q: number, t: number, l: number, lm: number, sol: string[]) {
  if (l == 0) {
    return q == 0 && t == 0;
  } else {
    if (getPruning(permPrun, q) > l || getPruning(flipPrun, t) > l) return false;
    let p, s, a, m;
    for (m = 0; m < 6; m++) {
      if (m != lm && m != lm - 3) {
        p = q;
        s = t;
        for (a = 0; a < 3; a++) {
          p = pmv(p, m);
          s = fmv(s, m);
          if (idacross(p, s, l - 1, m, sol)) {
            sol.push("FRUBLD".charAt(m) + " 2'".charAt(a));
            return true;
          }
        }
      }
    }
  }
  return false;
}

export let faceStr = ["D", "U", "L", "R", "F", "B"];
export const rotIdx = ["", "z2", "z'", "z", "x'", "x"];

let moveIdx = ["FRUBLD", "FLDBRU", "FDRBUL", "FULBDR", "URBDLF", "DRFULB"];
let yrotIdx = ["FRUBLD", "RBULFD", "BLUFRD", "LFURBD"];

export function solve_cross(moves: string) {
  init();

  let seq: any = ScrambleParser.parseNNN(
    solvFacelet(Puzzle.fromSequence(moves, { type: "rubik", order: [3] }, true, true).toFacelet()),
    3, "FRUBLD"
  );

  let ret = [];

  for (let face = 0; face < 6; face++) {
    let flip = 0;
    let perm = 0;

    for (let i = 0; i < seq.length; i++) {
      let m = moveIdx[face].indexOf(seq[i][1]);
      let p = ((seq[i][2] % 4) + 4) % 4;

      for (let j = 0; j < p; j++) {
        flip = fmv(flip, m);
        perm = pmv(perm, m);
      }
    }

    let sol: string[] = [];

    for (let len = 0; len < 100; len++) {
      if (idacross(perm, flip, len, -1, sol)) {
        break;
      }
    }

    sol.reverse();
    ret.push(sol);
  }

  return ret;
}

export function solve_xxcross(moves: any, face: number) {
  xxinit();
  let states: any[] = [];
  let yrot = 0;

  let seq: any = ScrambleParser.parseNNN(
    solvFacelet(Puzzle.fromSequence(moves, { type: "rubik", order: [3] }, true, true).toFacelet()),
    3, "FRUBLD"
  );

  for (yrot = 0; yrot < 4; yrot++) {
    let flip = 0;
    let perm = 0;
    let e1 = [8, 10, 12];
    let c1 = [12, 15, 18];
    for (let i = 0; i < seq.length; i++) {
      let m = yrotIdx[yrot].indexOf(
        "FRUBLD".charAt(moveIdx[face].indexOf(seq[i][1]))
      );
      let p = ((seq[i][2] % 4) + 4) % 4;
      for (let j = 0; j < p; j++) {
        flip = fmv(flip, m);
        perm = pmv(perm, m);
        e1 = [e1mv[e1[0]][m], e1mv[e1[1]][m], e1mv[e1[2]][m]];
        c1 = [c1mv[c1[0]][m], c1mv[c1[1]][m], c1mv[c1[2]][m]];
      }
    }
    states.push([perm, flip, e1, c1]);
  }
  let sol: string[] = [];
  let found = false;
  let len = 0;
  while (!found) {
    for (yrot = 0; yrot < 4; yrot++) {
      let state = states[yrot];
      if (
        idaxxcross(
          state[0],
          state[1],
          [state[2][0], state[2][1]],
          [state[3][0], state[3][1]],
          xxPrun01,
          len,
          -1,
          sol
        )
      ) {
        found = true;
        break;
      }
      if (
        idaxxcross(
          state[0],
          state[1],
          [state[2][0], state[2][2]],
          [state[3][0], state[3][2]],
          xxPrun02,
          len,
          -1,
          sol
        )
      ) {
        found = true;
        break;
      }
    }
    len++;
  }
  sol.reverse();
  for (let i = 0; i < sol.length; i++) {
    sol[i] = yrotIdx[yrot]["FRUBLD".indexOf(sol[i][0])] + sol[i][1];
  }
  return sol;
}

export function solve_xcross(moves: string, face: number) {
  xinit();
  let flip = 0;
  let perm = 0;
  let e1 = [8, 10, 12, 14];
  let c1 = [12, 15, 18, 21];
  
  let seq: any = ScrambleParser.parseNNN(
    solvFacelet(Puzzle.fromSequence(moves, { type: "rubik", order: [3] }, true, true).toFacelet()),
    3, "FRUBLD"
  );

  for (let i = 0; i < seq.length; i++) {
    let m = moveIdx[face].indexOf(seq[i][1]);
    let p = ((seq[i][2] % 4) + 4) % 4;

    for (let j = 0; j < p; j++) {
      flip = fmv(flip, m);
      perm = pmv(perm, m);
      for (let obj = 0; obj < 4; obj++) {
        e1[obj] = e1mv[e1[obj]][m];
        c1[obj] = c1mv[c1[obj]][m];
      }
    }
  }
  let sol: string[] = [];
  let found = false;
  let len = 0;
  while (!found) {
    for (let obj = 0; obj < 4; obj++) {
      if (idaxcross(perm, flip, e1[obj], c1[obj], obj, len, -1, sol)) {
        found = true;
        break;
      }
    }
    len++;
  }
  sol.reverse();

  return sol;
}

let fullInitRet = false;

function fullInit() {
  if (fullInitRet) {
    return;
  }
  fullInitRet = true;
  init();
  fullPrun = [];
  createPrun(fullPrun, 0, 190080, 7, fullmv, 6, 3, 6);
}

function mapCross(idx: number) {
  let comb = ~~(idx / 384);
  let perm = (idx >> 4) % 24;
  let flip = idx & 15;

  let arrp = [];
  let arrf = [];
  let pm: number[] = [];
  let fl: number[] = [];
  i2f(flip, fl);
  setNPerm(pm, perm, 4);
  let r = 4;
  let map = [7, 6, 5, 4, 10, 9, 8, 11, 3, 2, 1, 0];
  for (let i = 0; i < 12; i++) {
    if (comb >= Cnk[11 - i][r]) {
      comb -= Cnk[11 - i][r--];
      arrp[map[i]] = pm[r];
      arrf[map[i]] = fl[r];
    } else {
      arrp[map[i]] = arrf[map[i]] = -1;
    }
  }
  return [arrp, arrf];
}

export function getEasyCross(length: number) {
  fullInit();
  let lenA = Math.min(length % 10, 8);
  let lenB = Math.min(~~(length / 10), 8);
  let minLen = Math.min(lenA, lenB);
  let maxLen = Math.max(lenA, lenB);
  let ncase = [0, 1, 16, 174, 1568, 11377, 57758, 155012, 189978, 190080];
  let cases = rn(ncase[maxLen + 1] - ncase[minLen]) + 1;
  let i;
  for (i = 0; i < 190080; i++) {
    let prun = getPruning(fullPrun, i);
    if (prun <= maxLen && prun >= minLen && --cases == 0) {
      break;
    }
  }
  return mapCross(i);
}

export function getEasyXCross(length: number) {
  fullInit();
  xinit();
  let ncase = [1, 16, 174, 1568, 11377, 57758, 155012, 189978, 190080];
  length = Math.max(0, Math.min(length, 8));
  let remain = ncase[length];
  let isFound = false;

  while (!isFound) {
    let rndIdx = [];
    let sample = 500;
    for (let i = 0; i < sample; i++) {
      rndIdx.push(rn(remain));
    }
    rndIdx.sort(function (a, b) {
      return b - a;
    });
    let rndCases = [];
    let cnt = 0;
    for (let i = 0; i < 190080; i++) {
      let prun = getPruning(fullPrun, i);
      if (prun > length) {
        continue;
      }
      while (rndIdx[rndIdx.length - 1] == cnt) {
        rndCases.push(i);
        rndIdx.pop();
      }
      if (rndIdx.length == 0) {
        break;
      }
      cnt++;
    }
    rndIdx = rndPerm(sample);
    for (let i = 0; i < sample; i++) {
      let caze = rndCases[rndIdx[i]];
      let comb = ~~(caze / 384);
      let perm = comb * 24 + ((caze >> 4) % 24);
      let flip = (comb << 4) | (caze & 15);
      let sol: string[] = [];
      let corns = rndPerm(8).slice(4);
      let edges = rndPerm(8);

      let arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      let r = 4;
      for (let j = 0; j < 12; j++) {
        if (comb >= Cnk[11 - j][r]) {
          comb -= Cnk[11 - j][r--];
          arr[j] = -1;
        } else {
          arr[j] = edges.pop() as number;
        }
      }
      for (let j = 0; j < 4; j++) {
        corns[j] = corns[j] * 3 + rn(3);
        edges[j] = arr.indexOf(j) * 2 + rn(2);
        if (isFound || getPruning(ecPrun[j], corns[j] * 24 + edges[j]) > length) {
          continue;
        }
        let sol: string[] = [];
        for (let depth = 0; depth <= length; depth++) {
          if (idaxcross(perm, flip, edges[j], corns[j], j, depth, -1, sol)) {
            isFound = true;
            break;
          }
        }
      }
      if (!isFound) {
        continue;
      }
      let crossArr = mapCross(caze);
      crossArr[2] = valuedArray(8, -1);
      crossArr[3] = valuedArray(8, -1);
      let map = [7, 6, 5, 4, 10, 9, 8, 11, 3, 2, 1, 0];
      let map2 = [6, 5, 4, 7, 2, 1, 0, 3];
      for (let i = 0; i < 4; i++) {
        crossArr[0][map[edges[i] >> 1]] = map[i + 4];
        crossArr[1][map[edges[i] >> 1]] = edges[i] % 2;
        crossArr[2][map2[~~(corns[i] / 3)]] = map2[i + 4];
        crossArr[3][map2[~~(corns[i] / 3)]] = (30 - corns[i]) % 3;
      }
      return crossArr;
    }
  }
}
