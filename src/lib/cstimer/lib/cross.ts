/**
 * Copyright (C) 2023  Shuang Chen

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.

  -----------------------------------------------------------------------
  
  Modified by Isaac Vega <isaacvega1996@gmail.com>
 */

import {
  Cnk,
  createMove,
  createPrun,
  edgeMove,
  getNPerm,
  getPruning,
  rn,
  rndPerm,
  setNPerm,
  valuedArray,
} from "./mathlib";

let permPrun, flipPrun, ecPrun, fullPrun;
const cmv = [];
const pmul = [];
const fmul = [];

const e1mv = [];
const c1mv = [];
const xxPrun01 = [];
const xxPrun02 = [];

function pmv(a, c) {
  const b = cmv[c][~~(a / 24)];
  return 24 * ~~(b / 384) + pmul[a % 24][(b >> 4) % 24];
}

function fmv(b, c) {
  const a = cmv[c][b >> 4];
  return (~~(a / 384) << 4) | (fmul[b & 15][(a >> 4) % 24] ^ (a & 15));
}

function i2f(a, c) {
  for (let b = 3; 0 <= b; b--) (c[b] = a & 1), (a >>= 1);
}

function f2i(c) {
  for (var a = 0, b = 0; 4 > b; b++) (a <<= 1), (a |= c[b]);
  return a;
}

function fullmv(idx, move) {
  const slice = cmv[move][~~(idx / 384)];
  const flip = fmul[idx & 15][(slice >> 4) % 24] ^ (slice & 15);
  const perm = pmul[(idx >> 4) % 24][(slice >> 4) % 24];
  return ~~(slice / 384) * 384 + 16 * perm + flip;
}

let isInit = false;

function init() {
  if (isInit) return;
  isInit = true;

  for (var i = 0; i < 24; i++) {
    pmul[i] = [];
  }
  for (var i = 0; i < 16; i++) {
    fmul[i] = [];
  }
  const pm1 = [];
  const pm2 = [];
  const pm3 = [];
  for (var i = 0; i < 24; i++) {
    for (let j = 0; j < 24; j++) {
      setNPerm(pm1, i, 4);
      setNPerm(pm2, j, 4);
      for (var k = 0; k < 4; k++) {
        pm3[k] = pm1[pm2[k]];
      }
      pmul[i][j] = getNPerm(pm3, 4);
      if (i < 16) {
        i2f(i, pm1);
        for (var k = 0; k < 4; k++) {
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

  //combMove[comb][m] = comb*, flip*, perm*
  //newcomb = comb*, newperm = perm x perm*, newflip = flip x perm* ^ flip*
  function getmv(comb, m) {
    const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let r = 4;
    for (var i = 0; i < 12; i++) {
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
    const pm = [];
    for (var i = 0; i < 12; i++) {
      if (arr[i] >= 0) {
        comb += Cnk[11 - i][r--];
        pm[r] = arr[i] >> 1;
        t |= (arr[i] & 1) << (3 - r);
      }
    }
    return ((comb * 24 + getNPerm(pm, 4)) << 4) | t;
  }
}

let isxxInit = false;

function xxinit() {
  if (isxxInit) return;
  isxxInit = true;

  xinit();
  const obj1 = 4;
  let obj2 = 5;
  createPrun(
    xxPrun01,
    obj1 * 3 * 24 + obj1 * 2 + 576 * (obj2 * 3 * 24 + obj2 * 2),
    576 * 576,
    7,
    function (q, m) {
      const ec1 = q % 576;
      const ec2 = ~~(q / 576);
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
    function (q, m) {
      const ec1 = q % 576;
      const ec2 = ~~(q / 576);
      return (
        c1mv[~~(ec1 / 24)][m] * 24 +
        e1mv[ec1 % 24][m] +
        576 * (c1mv[~~(ec2 / 24)][m] * 24 + e1mv[ec2 % 24][m])
      );
    }
  );
}

let isxInit = false;

function xinit() {
  if (isxInit) return;
  isxInit = true;

  init();
  for (let i = 0; i < 24; i++) {
    c1mv[i] = [];
    e1mv[i] = [];
    for (let m = 0; m < 6; m++) {
      c1mv[i][m] = cornMove(i, m);
      const edge = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
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
    const prun = [];
    createPrun(prun, (obj + 4) * 3 * 24 + (obj + 4) * 2, 576, 5, function (q, m) {
      return c1mv[~~(q / 24)][m] * 24 + e1mv[q % 24][m];
    });
    ecPrun[obj] = prun;
  }

  function cornMove(corn, m) {
    const idx = ~~(corn / 3);
    let twst = corn % 3;
    const idxt = [
      [3, 1, 2, 7, 0, 5, 6, 4],
      [0, 1, 6, 2, 4, 5, 7, 3],
      [1, 2, 3, 0, 4, 5, 6, 7],
      [0, 5, 1, 3, 4, 6, 2, 7],
      [4, 0, 2, 3, 5, 1, 6, 7],
      [0, 1, 2, 3, 7, 4, 5, 6],
    ];
    const twstt = [
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
function idaxxcross(q, t, e, c, xxPrun, l, lm, sol) {
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
function idaxcross(q, t, e, c, obj, l, lm, sol) {
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
function idacross(q, t, l, lm, sol) {
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

const faceStr = ["D", "U", "L", "R", "F", "B"];
const moveIdx = ["FRUBLD", "FLDBRU", "FDRBUL", "FULBDR", "URBDLF", "DRFULB"];
const rotIdx = ["&nbsp;&nbsp;", "z2", "z'", "z&nbsp;", "x'", "x&nbsp;"];
const yrotIdx = ["FRUBLD", "RBULFD", "BLUFRD", "LFURBD"];

let curScramble;

export function solve_cross(moves: string) {
  init();
  const ret = [];
  for (let face = 0; face < 6; face++) {
    let flip = 0;
    let perm = 0;
    for (let i = 0; i < moves.length; i++) {
      const m = moveIdx[face].indexOf("FRUBLD".charAt(moves[i][0]));
      const p = moves[i][2];
      for (let j = 0; j < p; j++) {
        flip = fmv(flip, m);
        perm = pmv(perm, m);
      }
    }
    const sol = [];
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

function solve_xxcross(moves, face) {
  xxinit();
  const states = [];
  let yrot = 0;
  for (yrot = 0; yrot < 4; yrot++) {
    let flip = 0;
    let perm = 0;
    let e1 = [8, 10, 12];
    let c1 = [12, 15, 18];
    for (var i = 0; i < moves.length; i++) {
      const m = yrotIdx[yrot].indexOf(
        "FRUBLD".charAt(moveIdx[face].indexOf("FRUBLD".charAt(moves[i][0])))
      );
      const p = moves[i][2];
      for (let j = 0; j < p; j++) {
        flip = fmv(flip, m);
        perm = pmv(perm, m);
        e1 = [e1mv[e1[0]][m], e1mv[e1[1]][m], e1mv[e1[2]][m]];
        c1 = [c1mv[c1[0]][m], c1mv[c1[1]][m], c1mv[c1[2]][m]];
      }
    }
    states.push([perm, flip, e1, c1]);
  }
  const sol = [];
  let found = false;
  let len = 0;
  while (!found) {
    for (yrot = 0; yrot < 4; yrot++) {
      const state = states[yrot];
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
  for (var i = 0; i < sol.length; i++) {
    sol[i] = yrotIdx[yrot]["FRUBLD".indexOf(sol[i][0])] + sol[i][1];
  }
  return sol;
}

function solve_xcross(moves, face) {
  xinit();
  let flip = 0;
  let perm = 0;
  const e1 = [8, 10, 12, 14];
  const c1 = [12, 15, 18, 21];
  for (let i = 0; i < moves.length; i++) {
    const m = moveIdx[face].indexOf("FRUBLD".charAt(moves[i][0]));
    const p = moves[i][2];
    for (let j = 0; j < p; j++) {
      flip = fmv(flip, m);
      perm = pmv(perm, m);
      for (var obj = 0; obj < 4; obj++) {
        e1[obj] = e1mv[e1[obj]][m];
        c1[obj] = c1mv[c1[obj]][m];
      }
    }
  }
  const sol = [];
  let found = false;
  let len = 0;
  while (!found) {
    for (var obj = 0; obj < 4; obj++) {
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

let isFullInit = false;

function fullInit() {
  if (isFullInit) return;
  isFullInit = true;

  init();
  fullPrun = [];
  createPrun(fullPrun, 0, 190080, 7, fullmv, 6, 3, 6);
}

function mapCross(idx) {
  let comb = ~~(idx / 384);
  const perm = (idx >> 4) % 24;
  const flip = idx & 15;

  const arrp = [];
  const arrf = [];
  const pm = [];
  const fl = [];
  i2f(flip, fl);
  setNPerm(pm, perm, 4);
  let r = 4;
  const map = [7, 6, 5, 4, 10, 9, 8, 11, 3, 2, 1, 0];
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
  const lenA = Math.min(length % 10, 8);
  const lenB = Math.min(~~(length / 10), 8);
  const minLen = Math.min(lenA, lenB);
  const maxLen = Math.max(lenA, lenB);
  const ncase = [0, 1, 16, 174, 1568, 11377, 57758, 155012, 189978, 190080];
  let cases = rn(ncase[maxLen + 1] - ncase[minLen]) + 1;
  let i;
  for (i = 0; i < 190080; i++) {
    const prun = getPruning(fullPrun, i);
    if (prun <= maxLen && prun >= minLen && --cases == 0) {
      break;
    }
  }
  return mapCross(i);
}

export function getEasyXCross(length: number) {
  fullInit();
  xinit();
  const ncase = [1, 16, 174, 1568, 11377, 57758, 155012, 189978, 190080];
  length = Math.max(0, Math.min(length, 8));
  const remain = ncase[length];
  let isFound = false;
  const testCnt = 0;
  while (!isFound) {
    let rndIdx = [];
    const sample = 500;
    for (var i = 0; i < sample; i++) {
      rndIdx.push(rn(remain));
    }
    rndIdx.sort(function (a, b) {
      return b - a;
    });
    const rndCases = [];
    let cnt = 0;
    for (var i = 0; i < 190080; i++) {
      const prun = getPruning(fullPrun, i);
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
    for (var i = 0; i < sample; i++) {
      const caze = rndCases[rndIdx[i]];
      let comb = ~~(caze / 384);
      const perm = comb * 24 + ((caze >> 4) % 24);
      const flip = (comb << 4) | (caze & 15);
      var sol = [];
      const ret = idacross(perm, flip, length, -1, sol);
      const corns = rndPerm(8).slice(4);
      const edges = rndPerm(8);

      const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      let r = 4;
      for (var j = 0; j < 12; j++) {
        if (comb >= Cnk[11 - j][r]) {
          comb -= Cnk[11 - j][r--];
          arr[j] = -1;
        } else {
          arr[j] = edges.pop();
        }
      }
      for (var j = 0; j < 4; j++) {
        corns[j] = corns[j] * 3 + rn(3);
        edges[j] = arr.indexOf(j) * 2 + rn(2);
        if (isFound || getPruning(ecPrun[j], corns[j] * 24 + edges[j]) > length) {
          continue;
        }
        var sol = [];
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
      const crossArr = mapCross(caze);
      crossArr[2] = valuedArray(8, -1);
      crossArr[3] = valuedArray(8, -1);
      const map = [7, 6, 5, 4, 10, 9, 8, 11, 3, 2, 1, 0];
      const map2 = [6, 5, 4, 7, 2, 1, 0, 3];
      for (var i = 0; i < 4; i++) {
        crossArr[0][map[edges[i] >> 1]] = map[i + 4];
        crossArr[1][map[edges[i] >> 1]] = edges[i] % 2;
        crossArr[2][map2[~~(corns[i] / 3)]] = map2[i + 4];
        crossArr[3][map2[~~(corns[i] / 3)]] = (30 - corns[i]) % 3;
      }
      return crossArr;
    }
  }
}
