// @ts-nocheck
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

import { getEasyXCross } from "@cstimer/lib/cross";
import {
  getNPerm,
  setNPerm,
  set8Perm,
  getNParity,
  rn,
  rndEl,
  valuedArray,
  idxArray,
  setNOri,
  getNOri,
} from "../lib/mathlib";
import { Search } from "../lib/min2phase";
import { getEasyCross } from "../tools/cross";
import { fixCase, regScrambler } from "./scramble";
import { between } from "@helpers/math";

const Ux1 = 0;
const Ux2 = 1;
const Ux3 = 2;
const Rx1 = 3;
const Rx2 = 4;
const Rx3 = 5;
const Fx1 = 6;
const Fx2 = 7;
const Fx3 = 8;
const Dx1 = 9;
const Dx2 = 10;
const Dx3 = 11;
const Lx1 = 12;
const Lx2 = 13;
const Lx3 = 14;
const Bx1 = 15;
const Bx2 = 16;
const Bx3 = 17;

function $setFlip(obj: CubieCube1, idx: number) {
  let i, parity;
  parity = 0;
  for (i = 10; i >= 0; --i) {
    parity ^= obj.eo[i] = idx & 1;
    idx >>= 1;
  }
  obj.eo[11] = parity;
}

function $setTwist(obj: CubieCube1, idx: number) {
  let i, twst;
  twst = 0;
  for (i = 6; i >= 0; --i) {
    twst += obj.co[i] = idx % 3;
    idx = ~~(idx / 3);
  }
  obj.co[7] = (15 - twst) % 3;
}

function CornMult(a: CubieCube1, b: CubieCube1, prod: CubieCube1) {
  let corn, ori, oriA, oriB;
  for (corn = 0; corn < 8; ++corn) {
    prod.cp[corn] = a.cp[b.cp[corn]];
    oriA = a.co[b.cp[corn]];
    oriB = b.co[corn];
    ori = oriA;
    ori += oriA < 3 ? oriB : 6 - oriB;
    ori %= 3;
    oriA >= 3 !== oriB >= 3 && (ori += 3);
    prod.co[corn] = ori;
  }
}

class CubieCube {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];

  constructor() {
    this.cp = [0, 1, 2, 3, 4, 5, 6, 7];
    this.co = [0, 0, 0, 0, 0, 0, 0, 0];
    this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.eo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

class CubieCube1 {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];

  constructor(cperm: number, twist: number, eperm: number, flip: number) {
    this.cp = [0, 1, 2, 3, 4, 5, 6, 7];
    this.co = [0, 0, 0, 0, 0, 0, 0, 0];
    this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.eo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    set8Perm(this.cp, cperm);
    $setTwist(this, twist);
    setNPerm(this.ep, eperm, 12);
    $setFlip(this, flip);
  }
}

function EdgeMult(a: CubieCube1, b: CubieCube1, prod: CubieCube1) {
  let ed;
  for (ed = 0; ed < 12; ++ed) {
    prod.ep[ed] = a.ep[b.ep[ed]];
    prod.eo[ed] = b.eo[ed] ^ a.eo[b.ep[ed]];
  }
}

let ret = false;

function initMove() {
  if (ret) {
    return;
  }

  ret = true;
  let a, p;
  moveCube[0] = new CubieCube1(15120, 0, 119750400, 0);
  moveCube[3] = new CubieCube1(21021, 1494, 323403417, 0);
  moveCube[6] = new CubieCube1(8064, 1236, 29441808, 550);
  moveCube[9] = new CubieCube1(9, 0, 5880, 0);
  moveCube[12] = new CubieCube1(1230, 412, 2949660, 0);
  moveCube[15] = new CubieCube1(224, 137, 328552, 137);
  for (a = 0; a < 18; a += 3) {
    for (p = 0; p < 2; ++p) {
      moveCube[a + p + 1] = new CubieCube();
      EdgeMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
      CornMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
    }
  }
}

const moveCube: CubieCube[] = [];
const cornerFacelet = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
];
const edgeFacelet = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
];

function toFaceCube(cc: CubieCube1) {
  let c, e, f, i, j, n, ori, ts;
  f = [];
  ts = [85, 82, 70, 68, 76, 66];
  for (i = 0; i < 54; ++i) {
    f[i] = ts[~~(i / 9)];
  }
  for (c = 0; c < 8; ++c) {
    j = cc.cp[c];
    ori = cc.co[c];
    for (n = 0; n < 3; ++n) f[cornerFacelet[c][(n + ori) % 3]] = ts[~~(cornerFacelet[j][n] / 9)];
  }
  for (e = 0; e < 12; ++e) {
    j = cc.ep[e];
    ori = cc.eo[e];
    for (n = 0; n < 2; ++n) f[edgeFacelet[e][(n + ori) % 2]] = ts[~~(edgeFacelet[j][n] / 9)];
  }
  return String.fromCharCode.apply(null, f);
}

// SCRAMBLERS
// @ts-ignore
const search = new Search();

export function getRandomScramble() {
  return getAnyScramble(0xffffffffffff, 0xffffffffffff, 0xffffffff, 0xffffffff);
}

export function getFMCScramble() {
  let scramble = "",
    axis1,
    axis2,
    axisl1,
    axisl2;
  do {
    scramble = getRandomScramble();
    const moveseq = scramble.split(" ");
    if (moveseq.length < 3) {
      continue;
    }
    axis1 = moveseq[0][0];
    axis2 = moveseq[1][0];
    axisl1 = moveseq[moveseq.length - 2][0];
    axisl2 = moveseq[moveseq.length - 3][0];
  } while (
    axis1 == "F" ||
    (axis1 == "B" && axis2 == "F") ||
    axisl1 == "R" ||
    (axisl1 == "L" && axisl2 == "R")
  );
  return "R' U' F " + scramble + "R' U' F";
}

function cntU(b: any) {
  let c, a;
  for (c = 0, a = 0; a < b.length; a++) -1 == b[a] && c++;
  return c;
}

function fixOri(arr: number[], cntU: number, base: number) {
  let sum = 0;
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] != -1) {
      sum += arr[i];
    }
  }
  sum %= base;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] == -1) {
      if (cntU-- == 1) {
        arr[i] = ((base << 4) - sum) % base;
      } else {
        arr[i] = rn(base);
        sum += arr[i];
      }
    }
    idx *= base;
    idx += arr[i];
  }
  return idx;
}

function fixPerm(arr: number[], cntU: number, parity: number) {
  const val = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] != -1) {
      val[arr[i]] = -1;
    }
  }
  for (let i = 0, j = 0; i < val.length; i++) {
    if (val[i] != -1) {
      val[j++] = val[i];
    }
  }
  let last: number = 0;
  let i;
  for (i = 0; i < arr.length && cntU > 0; i++) {
    if (arr[i] == -1) {
      const r = rn(cntU);
      arr[i] = val[r];
      for (let j = r; j < 11; j++) {
        val[j] = val[j + 1];
      }
      if (cntU-- == 2) {
        last = i;
      }
    }
  }
  if (getNParity(getNPerm(arr, arr.length), arr.length) == 1 - parity) {
    const temp = arr[i - 1];
    arr[i - 1] = arr[last];
    arr[last] = temp;
  }
  return getNPerm(arr, arr.length);
}

//arr: 53 bit integer
function parseMask(arr: any, length: number) {
  if ("number" !== typeof arr) {
    return arr;
  }
  const ret = [];
  for (let i = 0; i < length; i++) {
    const val = arr & 0xf; // should use "/" instead of ">>" to avoid unexpected type conversion
    ret[i] = val == 15 ? -1 : val;
    arr /= 16;
  }
  return ret;
}

const aufsuff = [[], [Ux1], [Ux2], [Ux3]];

const rlpresuff = [[], [Rx1, Lx3], [Rx2, Lx2], [Rx3, Lx1]];

const rlappsuff = ["", "x'", "x2", "x"];

const emptysuff = [[]];

function getAnyScramble(
  _ep: any,
  _eo: any,
  _cp: number,
  _co: number,
  _rndapp?: any,
  _rndpre?: any
) {
  initMove();
  _rndapp = _rndapp || emptysuff;
  _rndpre = _rndpre || emptysuff;
  const $_ep = parseMask(_ep, 12);
  const $_eo = parseMask(_eo, 12);
  const $_cp = parseMask(_cp, 8);
  const $_co = parseMask(_co, 8);
  let solution = "";
  do {
    const eo = $_eo.slice();
    const ep = $_ep.slice();
    const co = $_co.slice();
    const cp = $_cp.slice();
    const neo = fixOri(eo, cntU(eo), 2);
    const nco = fixOri(co, cntU(co), 3);
    let nep, ncp;
    const ue = cntU(ep);
    const uc = cntU(cp);
    if (ue == 0 && uc == 0) {
      nep = getNPerm(ep, 12);
      ncp = getNPerm(cp, 8);
    } else if (ue != 0 && uc == 0) {
      ncp = getNPerm(cp, 8);
      nep = fixPerm(ep, ue, getNParity(ncp, 8));
    } else if (ue == 0 && uc != 0) {
      nep = getNPerm(ep, 12);
      ncp = fixPerm(cp, uc, getNParity(nep, 12));
    } else {
      nep = fixPerm(ep, ue, -1);
      ncp = fixPerm(cp, uc, getNParity(nep, 12));
    }
    if (ncp + nco + nep + neo == 0) {
      continue;
    }
    let cc = new CubieCube1(ncp, nco, nep, neo);
    let cc2 = new CubieCube();
    const rndpre = rndEl(_rndpre);
    const rndapp = rndEl(_rndapp);
    for (let i = 0; i < rndpre.length; i++) {
      CornMult(moveCube[rndpre[i]], cc, cc2);
      EdgeMult(moveCube[rndpre[i]], cc, cc2);
      const tmp = cc2;
      cc2 = cc;
      cc = tmp;
    }
    for (let i = 0; i < rndapp.length; i++) {
      CornMult(cc, moveCube[rndapp[i]], cc2);
      EdgeMult(cc, moveCube[rndapp[i]], cc2);
      const tmp = cc2;
      cc2 = cc;
      cc = tmp;
    }
    const posit = toFaceCube(cc);
    // @ts-ignore
    const search0 = new Search();
    solution = search0.solution(posit, 21, 1e9, 50, 2);
  } while (solution.length <= 3);
  return solution.replace(/ +/g, " ");
}

export function getEdgeScramble() {
  return getAnyScramble(0xffffffffffff, 0xffffffffffff, 0x76543210, 0x00000000);
}

export function getCornerScramble() {
  return getAnyScramble(0xba9876543210, 0x000000000000, 0xffffffff, 0xffffffff);
}

export function getLLScramble() {
  return getAnyScramble(0xba987654ffff, 0x00000000ffff, 0x7654ffff, 0x0000ffff);
}

export const f2l_map = [
  [0x2000, 4, "Easy-01"],
  [0x1011, 4, "Easy-02"],
  [0x2012, 4, "Easy-03"],
  [0x1003, 4, "Easy-04"],
  [0x2003, 4, "RE-05"],
  [0x1012, 4, "RE-06"],
  [0x2002, 4, "RE-07"],
  [0x1013, 4, "RE-08"],
  [0x2013, 4, "REFC-09"],
  [0x1002, 4, "REFC-10"],
  [0x2010, 4, "REFC-11"],
  [0x1001, 4, "REFC-12"],
  [0x2011, 4, "REFC-13"],
  [0x1000, 4, "REFC-14"],
  [0x2001, 4, "SPGO-15"],
  [0x1010, 4, "SPGO-16"],
  [0x0000, 4, "SPGO-17"],
  [0x0011, 4, "SPGO-18"],
  [0x0003, 4, "PMS-19"],
  [0x0012, 4, "PMS-20"],
  [0x0002, 4, "PMS-21"],
  [0x0013, 4, "PMS-22"],
  [0x0001, 4, "Weird-23"],
  [0x0010, 4, "Weird-24"],
  [0x0400, 4, "CPEU-25"],
  [0x0411, 4, "CPEU-26"],
  [0x1400, 4, "CPEU-27"],
  [0x2411, 4, "CPEU-28"],
  [0x1411, 4, "CPEU-29"],
  [0x2400, 4, "CPEU-30"],
  [0x0018, 4, "EPCU-31"],
  [0x0008, 4, "EPCU-32"],
  [0x2008, 4, "EPCU-33"],
  [0x1008, 4, "EPCU-34"],
  [0x2018, 4, "EPCU-35"],
  [0x1018, 4, "EPCU-36"],
  [0x0418, 1, "ECP-37"],
  [0x1408, 1, "ECP-38"],
  [0x2408, 1, "ECP-39"],
  [0x1418, 1, "ECP-40"],
  [0x2418, 1, "ECP-41"],
  [0x0408, 1, "Solved-42"],
] as const;

const f2lprobs = idxArray(f2l_map, 1);
export const f2lfilter = idxArray(f2l_map, 2);

export function getLSLLScramble(type: any, length: any, cases: any) {
  const caze = f2l_map[fixCase(cases, f2lprobs)][0];
  const ep = Math.pow(16, caze & 0xf);
  const eo = 0xf ^ ((caze >> 4) & 1);
  const cp = Math.pow(16, (caze >> 8) & 0xf);
  const co = 0xf ^ ((caze >> 12) & 3);
  return getAnyScramble(
    0xba9f7654ffff - 7 * ep,
    0x000f0000ffff - eo * ep,
    0x765fffff - 0xb * cp,
    0x000fffff - co * cp
  );
}

const crossProbs = [
  [0xffffffff3210, 0xffffffff0000],
  [0xbff8fff4fff0, 0x0ff0fff0fff0],
  [0xff98ff5fff1f, 0xff00ff0fff0f],
  [0xffff7654ffff, 0xffff0000ffff],
  [0xfa9ff6fff2ff, 0xf00ff0fff0ff],
  [0xbaff7fff3fff, 0x00ff0fff0fff],
];

const crossFilter = ["U", "R", "F", "D", "L", "B"];

export function getF2LScramble(_type: any, _length: any, prob: any) {
  /*
  0xabcdefghijkl

  a = BR    b = BL    c = FL    d = FR
  e = DB    f = DL    g = DF    h = DR
  i = UB    j = UL    k = UF    l = UR

  */
  const p = between(prob || 0, 0, crossProbs.length - 1);
  let _prob = crossProbs[p];

  if (typeof prob != "number" || prob < 0 || prob >= crossProbs.length) {
    _prob = rndEl(crossProbs);
  }

  return getAnyScramble(_prob[0], _prob[1], 0xffffffff, 0xffffffff);
}

function genZBLLMap() {
  const isVisited: number[] = [];
  const zbll_map = [];
  const cc = new CubieCube();
  for (let idx = 0; idx < 27 * 24 * 24; idx++) {
    if ((isVisited[idx >> 5] >> (idx & 0x1f)) & 1) {
      continue;
    }
    const epi = idx % 24;
    const cpi = ~~(idx / 24) % 24;
    const coi = ~~(idx / 24 / 24);
    if (getNParity(cpi, 4) != getNParity(epi, 4)) {
      continue;
    }
    const co = setNOri(cc.co, coi, 4, -3);
    const cp = setNPerm(cc.cp, cpi, 4, 0);
    const ep = setNPerm(cc.ep, epi, 4, 0);
    const zbcase: any[] = [0, 0, 0, 0, null];
    for (let i = 0; i < 4; i++) {
      zbcase[0] += cp[i] << (i * 4);
      zbcase[1] += co[i] << (i * 4);
      zbcase[2] += ep[i] << (i * 4);
    }
    for (let conj = 0; conj < 16; conj++) {
      const c0 = conj >> 2;
      const c1 = conj & 3;
      const co2 = [],
        cp2 = [],
        ep2 = [];
      for (let i = 0; i < 4; i++) {
        co2[(i + c0) & 3] = co[i];
        cp2[(i + c0) & 3] = (cp[i] + c1) & 3;
        ep2[(i + c0) & 3] = (ep[i] + c1) & 3;
      }
      const co2i = getNOri(co2, 4, -3);
      const cp2i = getNPerm(cp2, 4, 0);
      const ep2i = getNPerm(ep2, 4, 0);
      const idx2 = (co2i * 24 + cp2i) * 24 + ep2i;
      if ((isVisited[idx2 >> 5] >> (idx2 & 0x1f)) & 1) {
        continue;
      }
      isVisited[idx2 >> 5] |= 1 << (idx2 & 0x1f);
      zbcase[3]++;
    }
    if (idx > 0) {
      // skip solved state
      zbll_map.push(zbcase);
    }
  }

  const coNames: Record<number, string> = {};
  coNames[0x0000] = "O";
  coNames[0x0012] = "U";
  coNames[0x0021] = "T";
  coNames[0x0102] = "L";
  coNames[0x0111] = "aS";
  coNames[0x0222] = "S";
  coNames[0x1122] = "Pi";
  coNames[0x1212] = "H";
  const coCnts: Record<string, any> = {};
  for (let i = 0; i < zbll_map.length; i++) {
    const zbcase = zbll_map[i];
    const coName = coNames[zbcase[1]];
    coCnts[coName] = coCnts[coName] || [];
    const coCnt = coCnts[coName];
    let cpIdx = coCnt.indexOf(zbcase[0]);
    if (cpIdx == -1) {
      cpIdx = coCnt.length;
      coCnt.push(zbcase[0], 1);
    } else {
      coCnt[cpIdx + 1]++;
    }
    zbcase[4] = coName + ((cpIdx >> 1) + 1) + "-" + coCnts[coName][cpIdx + 1];
  }
  return zbll_map;
}

const zbll_map = genZBLLMap();
const zbprobs = idxArray(zbll_map, 3);
const zbfilter = idxArray(zbll_map, 4);

const coll_map: any[] = [
  [0x3210, 0x1101, "LeFeeeDeRRGFDGLDGBDGB", 4, "aS-1"],
  [0x2301, 0x1110, "ReFeeeDeLRGBDGLDGFDGB", 4, "aS-2"],
  [0x3021, 0x1101, "LeBeeeDeFFGLDGRDGBDGR", 4, "aS-3"],
  [0x2013, 0x1011, "LeFeeeDeBFGRDGLDGBDGR", 4, "aS-4"],
  [0x1203, 0x1011, "FeBeeeDeLFGBDGRDGLDGR", 4, "aS-5"],
  [0x3102, 0x1101, "FeBeeeDeRBGFDGRDGLDGL", 4, "aS-6"],
  [0x3210, 0x2121, "FeFeeeBeBLGRDGDRGLDGD", 2, "H-1"],
  [0x2301, 0x1212, "ReLeeeReLBGBDGDFGFDGD", 2, "H-2"],
  [0x1203, 0x1212, "ReBeeeLeBFGRDGDLGFDGD", 4, "H-3"],
  [0x2013, 0x1212, "LeReeeFeFRGLDGDBGBDGD", 4, "H-4"],
  [0x3021, 0x1020, "DeLeeeReDBGRFGBDGFLGD", 4, "L-1"],
  [0x1203, 0x0201, "DeReeeLeDFDBRDFDGLBGD", 4, "L-2"],
  [0x2301, 0x0102, "DeBeeeLeDFGRFGRDGLBGD", 4, "L-3"],
  [0x3210, 0x1020, "DeLeeeFeDRGFLGBDGBRGD", 4, "L-4"],
  [0x3102, 0x1020, "DeLeeeLeDFGBRGBDGRFGD", 4, "L-5"],
  [0x2013, 0x0201, "DeReeeReDBGLBGFDGFLGD", 4, "L-6"],
  [0x3210, 0x1122, "LeFeeeReFBGDRGLDGBDGD", 4, "Pi-1"],
  [0x2301, 0x2112, "FeLeeeFeRRGDBGBDGLDGD", 4, "Pi-2"],
  [0x1203, 0x1221, "ReLeeeReLBGDFGBDGFDGD", 4, "Pi-3"],
  [0x3102, 0x1122, "BeFeeeFeBRGDLGLDGRDGD", 4, "Pi-4"],
  [0x2013, 0x1221, "BeLeeeLeFFGDRGBDGRDGD", 4, "Pi-5"],
  [0x3021, 0x1122, "BeReeeLeBFGDLGFDGRDGD", 4, "Pi-6"],
  [0x3210, 0x2220, "ReBeeeFeDRGFLGDLGDBGD", 4, "S-1"],
  [0x2301, 0x0222, "BeReeeLeDFGRFGDBGDLGD", 4, "S-2"],
  [0x3021, 0x2220, "BeReeeFeDRGFLGDBGDLGD", 4, "S-3"],
  [0x2013, 0x2202, "ReBeeeLeDFGRFGDLGDBGD", 4, "S-4"],
  [0x3102, 0x2220, "FeBeeeLeDFGBRGDLGDRGD", 4, "S-5"],
  [0x1203, 0x2202, "LeReeeFeDRGLBGDBGDFGD", 4, "S-6"],
  [0x1203, 0x1002, "BeLeeeDeDBGRFGDFGRDGL", 4, "T-1"],
  [0x3102, 0x2100, "ReBeeeDeDLGBRGDLGFDGF", 4, "T-2"],
  [0x2301, 0x0210, "BeFeeeDeDBGFLGDRGRDGL", 4, "T-3"],
  [0x3210, 0x2100, "FeFeeeDeDBGBRGDRGLDGL", 4, "T-4"],
  [0x2013, 0x1002, "BeBeeeDeDLGRFGDLGRDGF", 4, "T-5"],
  [0x3021, 0x2100, "FeBeeeDeDRGRFGDLGLDGB", 4, "T-6"],
  [0x2301, 0x0120, "LeLeeeDeDFGBRGBDGDFGR", 4, "U-1"],
  [0x3210, 0x1200, "LeReeeDeDBGBRGFDGDFGL", 4, "U-2"],
  [0x3021, 0x1200, "FeFeeeDeDBGBRGLDGDRGL", 4, "U-3"],
  [0x2013, 0x2001, "BeFeeeDeDFGBRGLDGDLGR", 4, "U-4"],
  [0x1203, 0x2001, "ReFeeeDeDBGRFGLDGDBGL", 4, "U-5"],
  [0x3102, 0x1200, "LeBeeeDeDBGRFGRDGDFGL", 4, "U-6"],
  [0x3021, 0x0000, "DeDeeeDeDBGRFGBRGFLGL", 4, "O-Adj"],
  [0x2301, 0x0000, "DeDeeeDeDBGFLGRFGBRGL", 1, "O-Diag"],
  [0x3210, 0x0000, "DeDeeeDeDBGBRGRFGFLGL", 1, "O-AUF"],
];

const coprobs = idxArray(coll_map, 3);
const cofilter = idxArray(coll_map, 4);

function getCOLLScramble(type: any, length: any, cases: any) {
  const cocase = coll_map[fixCase(cases, coprobs)];
  return getAnyScramble(0xba987654ffff, 0, cocase[0] + 0x76540000, cocase[1], aufsuff, aufsuff);
}

export function getZBLLScramble(type: any, length: any, cases: any) {
  const zbcase = zbll_map[fixCase(cases, zbprobs)];
  return getAnyScramble(0xba987654ffff, 0, zbcase[0] + 0x76540000, zbcase[1], aufsuff, aufsuff);
}

export function getZZLLScramble() {
  return getAnyScramble(0xba9876543f1f, 0x000000000000, 0x7654ffff, 0x0000ffff, aufsuff);
}

export function getZBLSScramble() {
  return getAnyScramble(0xba9f7654ffff, 0x000000000000, 0x765fffff, 0x000fffff);
}

export function getLSEScramble() {
  const rnd4 = rn(4);
  return (
    getAnyScramble(
      0xba98f6f4ffff,
      0x0000f0f0ffff,
      0x76543210,
      0x00000000,
      [rlpresuff[rnd4]],
      aufsuff
    ) + rlappsuff[rnd4]
  );
}

const cmll_map = [
  0x0000, // O or solved
  0x1212, // H
  0x0102, // L
  0x1122, // Pi
  0x0222, // S
  0x0021, // T
  0x0012, // U
  0x0111, // aS
];
const cmprobs = [6, 12, 24, 24, 24, 24, 24, 24];
const cmfilter = ["O", "H", "L", "Pi", "S", "T", "U", "aS"];

export function getCMLLScramble(type: any, length: any, cases: any) {
  const rnd4 = rn(4);
  const presuff = [];
  for (let i = 0; i < aufsuff.length; i++) {
    presuff.push(aufsuff[i].concat(rlpresuff[rnd4]));
  }
  return (
    getAnyScramble(
      0xba98f6f4ffff,
      0x0000f0f0ffff,
      0x7654ffff,
      cmll_map[fixCase(cases, cmprobs)],
      presuff,
      aufsuff
    ) + rlappsuff[rnd4]
  );
}

export function getCLLScramble() {
  return getAnyScramble(0xba9876543210, 0x000000000000, 0x7654ffff, 0x0000ffff);
}

export function getELLScramble() {
  return getAnyScramble(0xba987654ffff, 0x00000000ffff, 0x76543210, 0x00000000);
}

export function get2GLLScramble() {
  return getAnyScramble(0xba987654ffff, 0x000000000000, 0x76543210, 0x0000ffff, aufsuff);
}

const pll_map = [
  [0x3210, 0x3021, 4, "Aa"],
  [0x3210, 0x3102, 4, "Ab"],
  [0x3210, 0x2301, 2, "E"],
  [0x3012, 0x3201, 4, "F"],
  [0x2130, 0x3021, 4, "Ga"],
  [0x1320, 0x3102, 4, "Gb"],
  [0x3021, 0x3102, 4, "Gc"],
  [0x3102, 0x3021, 4, "Gd"],
  [0x1032, 0x3210, 1, "H"],
  [0x3201, 0x3201, 4, "Ja"],
  [0x3120, 0x3201, 4, "Jb"],
  [0x1230, 0x3012, 1, "Na"],
  [0x3012, 0x3012, 1, "Nb"],
  [0x0213, 0x3201, 4, "Ra"],
  [0x2310, 0x3201, 4, "Rb"],
  [0x1230, 0x3201, 4, "T"],
  [0x3102, 0x3210, 4, "Ua"],
  [0x3021, 0x3210, 4, "Ub"],
  [0x3120, 0x3012, 4, "V"],
  [0x3201, 0x3012, 4, "Y"],
  [0x2301, 0x3210, 2, "Z"],
] as const;

const pllprobs = idxArray(pll_map, 2);
export const pllfilter: string[] = idxArray(pll_map, 3);

export function getPLLScramble(type: any, length: any, cases: any) {
  const pllcase = pll_map[fixCase(cases, pllprobs)];
  return getAnyScramble(
    pllcase[0] + 0xba9876540000,
    0x000000000000,
    pllcase[1] + 0x76540000,
    0x00000000,
    aufsuff,
    aufsuff
  );
}

const oll_map = [
  [0x1111, 0x1212, 2, "Point-1", 0xeba00],
  [0x1111, 0x1122, 4, "Point-2", 0xdda00],
  [0x1111, 0x0222, 4, "Point-3", 0x5b620],
  [0x1111, 0x0111, 4, "Point-4", 0x6d380],
  [0x0011, 0x2022, 4, "Square-5", 0x8360b],
  [0x0011, 0x1011, 4, "Square-6", 0x60b16],
  [0x0011, 0x2202, 4, "SLBS-7", 0x1362a],
  [0x0011, 0x0111, 4, "SLBS-8", 0x64392],
  [0x0011, 0x1110, 4, "Fish-9", 0x2538a],
  [0x0011, 0x2220, 4, "Fish-10", 0x9944c],
  [0x0011, 0x0222, 4, "SLBS-11", 0x9160e],
  [0x0011, 0x1101, 4, "SLBS-12", 0x44b13],
  [0x0101, 0x2022, 4, "Knight-13", 0x1a638],
  [0x0101, 0x0111, 4, "Knight-14", 0x2c398],
  [0x0101, 0x0222, 4, "Knight-15", 0x8a619],
  [0x0101, 0x1011, 4, "Knight-16", 0x28b1c],
  [0x1111, 0x0102, 4, "Point-17", 0x4b381],
  [0x1111, 0x0012, 4, "Point-18", 0x49705],
  [0x1111, 0x0021, 4, "Point-19", 0xc9a05],
  [0x1111, 0x0000, 1, "CO-20", 0x492a5],
  [0x0000, 0x1212, 2, "OCLL-21", 0x1455a],
  [0x0000, 0x1122, 4, "OCLL-22", 0xa445a],
  [0x0000, 0x0012, 4, "OCLL-23", 0x140fa],
  [0x0000, 0x0021, 4, "OCLL-24", 0x101de],
  [0x0000, 0x0102, 4, "OCLL-25", 0x2047e],
  [0x0000, 0x0111, 4, "OCLL-26", 0x2095e],
  [0x0000, 0x0222, 4, "OCLL-27", 0x1247a],
  [0x0011, 0x0000, 4, "CO-28", 0x012af],
  [0x0011, 0x0210, 4, "Awkward-29", 0x1138e],
  [0x0011, 0x2100, 4, "Awkward-30", 0x232aa],
  [0x0011, 0x0021, 4, "P-31", 0x50396],
  [0x0011, 0x1002, 4, "P-32", 0x0562b],
  [0x0101, 0x0021, 4, "T-33", 0x1839c],
  [0x0101, 0x0210, 4, "C-34", 0x2a2b8],
  [0x0011, 0x1020, 4, "Fish-35", 0x4a1d1],
  [0x0011, 0x0102, 4, "W-36", 0xc4293],
  [0x0011, 0x2010, 4, "Fish-37", 0x0338b],
  [0x0011, 0x0201, 4, "W-38", 0x11a2e],
  [0x0101, 0x1020, 4, "BLBS-39", 0x18a3c],
  [0x0101, 0x0102, 4, "BLBS-40", 0x8c299],
  [0x0011, 0x1200, 4, "Awkward-41", 0x152aa],
  [0x0011, 0x0120, 4, "Awkward-42", 0x0954d],
  [0x0011, 0x0012, 4, "P-43", 0xe0296],
  [0x0011, 0x2001, 4, "P-44", 0x03a2b],
  [0x0101, 0x0012, 4, "T-45", 0xa829c],
  [0x0101, 0x0120, 4, "C-46", 0x43863],
  [0x0011, 0x1221, 4, "L-47", 0x52b12],
  [0x0011, 0x1122, 4, "L-48", 0xa560a],
  [0x0011, 0x2112, 4, "L-49", 0xe4612],
  [0x0011, 0x2211, 4, "L-50", 0xec450],
  [0x0101, 0x1221, 4, "I-51", 0x1ab18],
  [0x0101, 0x1122, 4, "I-52", 0x53942],
  [0x0011, 0x2121, 4, "L-53", 0x54712],
  [0x0011, 0x1212, 4, "L-54", 0x1570a],
  [0x0101, 0x2121, 2, "I-55", 0x1c718],
  [0x0101, 0x1212, 2, "I-56", 0xaaa18],
  [0x0101, 0x0000, 2, "CO-57", 0x082bd],
] as const;

const ollprobs = idxArray(oll_map, 2);
export const ollfilter: string[] = idxArray(oll_map, 3);

export function getOLLScramble(type: any, length: any, cases: any) {
  const ollcase = oll_map[fixCase(cases, ollprobs)];
  return getAnyScramble(0xba987654ffff, ollcase[0], 0x7654ffff, ollcase[1], aufsuff, aufsuff);
}

export function getEOLineScramble() {
  return getAnyScramble(0xffff7f5fffff, 0x000000000000, 0xffffffff, 0xffffffff);
}

export function getEasyCrossScramble(type: any, length: any) {
  const cases = getEasyCross(length);
  return getAnyScramble(cases[0], cases[1], 0xffffffff, 0xffffffff);
}

export function genFacelet(facelet: string) {
  return search.solution(facelet, 21, 1e9, 50, 2);
}

export function solvFacelet(facelet: string) {
  return search.solution(facelet, 21, 1e9, 50, 0);
}

export function getCustomScramble(type: string, length: number, cases: any) {
  let ep = 0;
  let eo = 0;
  let cp = 0;
  let co = 0;
  let chk = 0x1100; //ep+cp|ep+1|cp+1|eo|co
  cases = cases || valuedArray(40, 1);
  for (let i = 0; i < 12; i++) {
    chk += (cases[i] ? 0x11000 : 0) + (cases[i + 20] ? 0x10 : 0);
    ep += (cases[i] ? 0xf : i) * Math.pow(16, i);
    eo += (cases[i + 20] ? 0xf : 0) * Math.pow(16, i);
  }
  for (let i = 0; i < 8; i++) {
    chk += (cases[i + 12] ? 0x10100 : 0) + (cases[i + 32] ? 0x1 : 0);
    cp += (cases[i + 12] ? 0xf : i) * Math.pow(16, i);
    co += (cases[i + 32] ? 0xf : 0) * Math.pow(16, i);
  }
  if ((chk & 0x1cccee) == 0) {
    return "U' U ";
  }
  return getAnyScramble(ep, eo, cp, co);
}

const daufsuff = [[], [Dx1], [Dx2], [Dx3]];
const daufrot = ["", "y", "y2", "y'"];

function getMehta3QBScramble() {
  const rnd4 = rn(4);
  return (
    getAnyScramble(0xffff765fffff, 0xffff000fffff, 0xf65fffff, 0xf00fffff, [daufsuff[rnd4]]) +
    daufrot[rnd4]
  );
}

function getMehtaEOLEScramble() {
  const skip = rn(4);
  const rnd4 = rn(4);
  return (
    getAnyScramble(
      0xba98765fffff + (0x4567 & (0xf << (skip * 4))) * 0x100000000,
      0x0000000fffff + (0xf << (skip * 4)) * 0x100000000,
      0xf65fffff,
      0xf00fffff,
      [daufsuff[rnd4]]
    ) + daufrot[rnd4]
  );
}

function getMehtaTDRScramble() {
  return getAnyScramble(0xba98765fffff, 0x000000000000, 0xf65fffff, 0xf00fffff);
}

function getMehta6CPScramble() {
  return getAnyScramble(0xba98765fffff, 0x000000000000, 0xf65fffff, 0x00000000);
}

function getMehtaL5EPScramble() {
  return getAnyScramble(0xba98765fffff, 0x000000000000, 0x76543210, 0x00000000);
}

function getMehtaCDRLLScramble() {
  return getAnyScramble(0xba98765fffff, 0x000000000000, 0x7654ffff, 0x0000ffff);
}

const customfilter = [
  "UR",
  "UF",
  "UL",
  "UB",
  "DR",
  "DF",
  "DL",
  "DB",
  "RF",
  "LF",
  "LB",
  "RB",
  "URF",
  "UFL",
  "ULB",
  "UBR",
  "DFR",
  "DLF",
  "DBL",
  "DRB",
];
for (let i = 0; i < 20; i++) {
  const piece = customfilter[i];
  customfilter[i + 20] = (piece.length == 2 ? "OriE-" : "OriC-") + piece;
  customfilter[i] = (piece.length == 2 ? "PermE-" : "PermC-") + piece;
}
const customprobs = valuedArray(40, 0);

const ttll_map: { 0: number; 1: number; 2: string }[] = [
  [0x32410, 0x3210, "FBar-1"],
  [0x32410, 0x3102, "FBar-2"],
  [0x32410, 0x3021, "FBar-3"],
  [0x32410, 0x2301, "FBar-4"],
  [0x32410, 0x2130, "FBar-5"],
  [0x32410, 0x2013, "FBar-6"],
  [0x32410, 0x1320, "FBar-7"],
  [0x32410, 0x1203, "FBar-8"],
  [0x32410, 0x1032, "FBar-9"],
  [0x32410, 0x0312, "FBar-10"],
  [0x32410, 0x0231, "FBar-11"],
  [0x32410, 0x0123, "FBar-12"],
  [0x32401, 0x3201, "2Opp-1"],
  [0x32401, 0x3120, "2Opp-2"],
  [0x32401, 0x3012, "2Opp-3"],
  [0x32401, 0x2310, "2Opp-4"],
  [0x32401, 0x2103, "2Opp-5"],
  [0x32401, 0x2031, "2Opp-6"],
  [0x32401, 0x1302, "2Opp-7"],
  [0x32401, 0x1230, "2Opp-8"],
  [0x32401, 0x1023, "2Opp-9"],
  [0x32401, 0x0321, "2Opp-10"],
  [0x32401, 0x0213, "2Opp-11"],
  [0x32401, 0x0132, "2Opp-12"],
  [0x31420, 0x3201, "ROpp-1"],
  [0x31420, 0x3120, "ROpp-2"],
  [0x31420, 0x3012, "ROpp-3"],
  [0x31420, 0x2310, "ROpp-4"],
  [0x31420, 0x2103, "ROpp-5"],
  [0x31420, 0x2031, "ROpp-6"],
  [0x31420, 0x1302, "ROpp-7"],
  [0x31420, 0x1230, "ROpp-8"],
  [0x31420, 0x1023, "ROpp-9"],
  [0x31420, 0x0321, "ROpp-10"],
  [0x31420, 0x0213, "ROpp-11"],
  [0x31420, 0x0132, "ROpp-12"],
  [0x31402, 0x3210, "RBar-1"],
  [0x31402, 0x3102, "RBar-2"],
  [0x31402, 0x3021, "RBar-3"],
  [0x31402, 0x2301, "RBar-4"],
  [0x31402, 0x2130, "RBar-5"],
  [0x31402, 0x2013, "RBar-6"],
  [0x31402, 0x1320, "RBar-7"],
  [0x31402, 0x1203, "RBar-8"],
  [0x31402, 0x1032, "RBar-9"],
  [0x31402, 0x0312, "RBar-10"],
  [0x31402, 0x0231, "RBar-11"],
  [0x31402, 0x0123, "RBar-12"],
  [0x30421, 0x3210, "2Bar-1"],
  [0x30421, 0x3102, "2Bar-2"],
  [0x30421, 0x3021, "2Bar-3"],
  [0x30421, 0x2301, "2Bar-4"],
  [0x30421, 0x2130, "2Bar-5"],
  [0x30421, 0x2013, "2Bar-6"],
  [0x30421, 0x1320, "2Bar-7"],
  [0x30421, 0x1203, "2Bar-8"],
  [0x30421, 0x1032, "2Bar-9"],
  [0x30421, 0x0312, "2Bar-10"],
  [0x30421, 0x0231, "2Bar-11"],
  [0x30421, 0x0123, "2Bar-12"],
  [0x30412, 0x3201, "FOpp-1"],
  [0x30412, 0x3120, "FOpp-2"],
  [0x30412, 0x3012, "FOpp-3"],
  [0x30412, 0x2310, "FOpp-4"],
  [0x30412, 0x2103, "FOpp-5"],
  [0x30412, 0x2031, "FOpp-6"],
  [0x30412, 0x1302, "FOpp-7"],
  [0x30412, 0x1230, "FOpp-8"],
  [0x30412, 0x1023, "FOpp-9"],
  [0x30412, 0x0321, "FOpp-10"],
  [0x30412, 0x0213, "FOpp-11"],
  [0x30412, 0x0132, "FOpp-12"],
];

const ttllprobs: number[] = [];
const ttllfilter: string[] = [];
for (let i = 0; i < ttll_map.length; i++) {
  ttllprobs[i] = 1;
  ttllfilter[i] = ttll_map[i][2];
}

function getTTLLScramble(type: any, length: any, cases: any) {
  const ttllcase = ttll_map[fixCase(cases, ttllprobs)];
  return getAnyScramble(
    0xba9876540000 + ttllcase[1],
    0x000000000000,
    0x76500000 + ttllcase[0],
    0x00000000,
    aufsuff,
    aufsuff
  );
}

const eols_map: number[] = [];
const eolsprobs: any[] = [];
const eolsfilter = [];

for (let i = 0; i < f2l_map.length; i++) {
  if (f2l_map[i][0] & 0xf0) {
    continue;
  }
  eols_map.push(f2l_map[i][0]);
  eolsprobs.push(f2lprobs[i]);
  eolsfilter.push(f2lfilter[i]);
}

function getEOLSScramble(type: any, length: any, cases: any) {
  const caze = eols_map[fixCase(cases, eolsprobs)];
  const ep = Math.pow(16, caze & 0xf);
  const cp = Math.pow(16, (caze >> 8) & 0xf);
  const co = 0xf ^ ((caze >> 12) & 3);
  return getAnyScramble(
    0xba9f7654ffff - 7 * ep,
    0x000000000000,
    0x765fffff - 0xb * cp,
    0x000fffff - co * cp,
    aufsuff
  );
}

const wvls_map: number[] = [];
const wvlsprobs: any[] = [];
const wvlsfilter = [
  "Oriented",
  "Rectangle-1",
  "Rectangle-2",
  "Tank-1",
  "Bowtie-1",
  "Bowtie-3",
  "Tank-2",
  "Bowtie-2",
  "Bowtie-4",
  "Snake-1",
  "Adjacent-1",
  "Adjacent-2",
  "Gun-Far",
  "Sune-1",
  "Pi-Near",
  "Gun-Back",
  "Pi-Front",
  "H-Side",
  "Snake-2",
  "Adjacent-3",
  "Adjacent-4",
  "Gun-Sides",
  "H-Front",
  "Pi-Back",
  "Gun-Near",
  "Pi-Far",
  "Sune-2",
];

for (let i = 0; i < 27; i++) {
  wvls_map[i] = (~~(i / 9) << 12) | (~~(i / 3) % 3 << 8) | i % 3;
  wvlsprobs[i] = 1;
}

function getWVLSScramble(type: any, length: any, cases: any) {
  const caze = wvls_map[fixCase(cases, wvlsprobs)];
  return getAnyScramble(0xba9f7654ff8f, 0x000000000000, 0x765fff4f, 0x000f0020 | caze);
}

const vls_map: number[][] = [];
const vlsprobs: any[] = [];
const vlsfilter = [];

for (let i = 0; i < 27 * 8; i++) {
  const co = i % 27;
  const eo = ~~(i / 27);
  vls_map[i] = [
    (~~(co / 9) % 3 << 12) | (~~(co / 3) % 3 << 8) | co % 3,
    (((eo >> 2) & 1) << 12) | (((eo >> 1) & 1) << 8) | (eo & 1),
  ];
  vlsprobs[i] = 1;
  vlsfilter[i] =
    ["WVLS", "UB", "UF", "UF UB", "UL", "UB UL", "UF UL", "No Edge"][eo] + "-" + (co + 1);
}

function getVLSScramble(type: any, length: any, cases: any) {
  const caze = vls_map[fixCase(cases, vlsprobs)];
  return getAnyScramble(
    0xba9f7654ff8f,
    0x000f00000000 + caze[1],
    0x765fff4f,
    0x000f0020 + caze[0],
    [[Ux3]]
  );
}

function getSBRouxScramble() {
  const rnd4 = rn(4);
  return (
    getAnyScramble(0xfa9ff6ffffff, 0xf00ff0ffffff, 0xf65fffff, 0xf00fffff, [rlpresuff[rnd4]]) +
    rlappsuff[rnd4]
  );
}

function getEasyXCrossScramble(type: any, length: any) {
  const cases: any = getEasyXCross(length);
  return getAnyScramble(cases[0], cases[1], cases[2], cases[3]);
}

regScrambler("333", getRandomScramble)("333oh", getRandomScramble)("333ft", getRandomScramble)(
  "333fm",
  getFMCScramble
)("edges", getEdgeScramble)("corners", getCornerScramble)("ll", getLLScramble)(
  "lsll2",
  getLSLLScramble,
  [f2lfilter, f2lprobs]
)("f2l", getF2LScramble, [crossFilter, crossProbs])("zbll", getZBLLScramble, [zbfilter, zbprobs])(
  "zzll",
  getZZLLScramble
)("zbls", getZBLSScramble)("lse", getLSEScramble)("cmll", getCMLLScramble, [cmfilter, cmprobs])(
  "cll",
  getCLLScramble
)("ell", getELLScramble)("pll", getPLLScramble, [pllfilter, pllprobs])("oll", getOLLScramble, [
  ollfilter,
  ollprobs,
])("2gll", get2GLLScramble)("easyc", getEasyCrossScramble)("eoline", getEOLineScramble)(
  "333custom",
  getCustomScramble,
  [customfilter, customprobs]
)("ttll", getTTLLScramble, [ttllfilter, ttllprobs])("eols", getEOLSScramble, [
  eolsfilter,
  eolsprobs,
])("wvls", getWVLSScramble, [wvlsfilter, wvlsprobs])("vls", getVLSScramble, [vlsfilter, vlsprobs])(
  "coll",
  getCOLLScramble,
  [cofilter, coprobs]
)("sbrx", getSBRouxScramble)("mt3qb", getMehta3QBScramble)("mteole", getMehtaEOLEScramble)(
  "mttdr",
  getMehtaTDRScramble
)("mt6cp", getMehta6CPScramble)("mtl5ep", getMehtaL5EPScramble)("mtcdrll", getMehtaCDRLLScramble)(
  "easyxc",
  getEasyXCrossScramble
);
