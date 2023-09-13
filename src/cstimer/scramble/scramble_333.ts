import { getEasyXCross } from '@cstimer/lib/cross';
import { getNPerm, setNPerm, set8Perm, getNParity, rn, rndEl, valuedArray, idxArray } from '../lib/mathlib';
import { Search } from '../lib/min2phase';
import { getEasyCross } from '../tools/cross';
import { fixCase, regScrambler } from './scramble';

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
    parity ^= obj.eo[i] = (idx & 1);
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
    ((oriA >= 3) !== (oriB >= 3)) && (ori += 3);
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
  if ( ret ) {
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
      moveCube[a + p + 1] = new CubieCube;
      EdgeMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
      CornMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
    }
  }
}

let moveCube: CubieCube[] = [];
let cornerFacelet = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51]
];
let edgeFacelet = [
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
  [48, 14]
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
    for (n = 0; n < 3; ++n)
      f[cornerFacelet[c][(n + ori) % 3]] = ts[~~(cornerFacelet[j][n] / 9)];
  }
  for (e = 0; e < 12; ++e) {
    j = cc.ep[e];
    ori = cc.eo[e];
    for (n = 0; n < 2; ++n)
      f[edgeFacelet[e][(n + ori) % 2]] = ts[~~(edgeFacelet[j][n] / 9)];
  }
  return String.fromCharCode.apply(null, f);
}


// SCRAMBLERS
// @ts-ignore
let search = new Search();

export function getRandomScramble() {
  return getAnyScramble(0xffffffffffff, 0xffffffffffff, 0xffffffff, 0xffffffff);
}

export function getFMCScramble() {
  let scramble = "",
    axis1, axis2, axisl1, axisl2;
  do {
    scramble = getRandomScramble();
    let moveseq = scramble.split(' ');
    if (moveseq.length < 3) {
      continue;
    }
    axis1 = moveseq[0][0];
    axis2 = moveseq[1][0];
    axisl1 = moveseq[moveseq.length - 2][0];
    axisl2 = moveseq[moveseq.length - 3][0];
  } while (
    axis1 == 'F' || axis1 == 'B' && axis2 == 'F' ||
    axisl1 == 'R' || axisl1 == 'L' && axisl2 == 'R');
  return "R' U' F " + scramble + "R' U' F";
}

function cntU(b: any) {
  let c, a;
  for (c = 0, a = 0; a < b.length; a++) - 1 == b[a] && c++;
  return c
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
  let val = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
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
      let r = rn(cntU);
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
    let temp = arr[i - 1];
    arr[i - 1] = arr[last];
    arr[last] = temp;
  }
  return getNPerm(arr, arr.length);
}

//arr: 53 bit integer
function parseMask(arr: any, length: number) {
  if ('number' !== typeof arr) {
    return arr;
  }
  let ret = [];
  for (let i = 0; i < length; i++) {
    let val = arr & 0xf; // should use "/" instead of ">>" to avoid unexpected type conversion
    ret[i] = val == 15 ? -1 : val;
    arr /= 16;
  }
  return ret;
}

let aufsuff = [
  [],
  [Ux1],
  [Ux2],
  [Ux3]
];

let rlpresuff = [
  [],
  [Rx1, Lx3],
  [Rx2, Lx2],
  [Rx3, Lx1]
];

let rlappsuff = ["", "x'", "x2", "x"];

let emptysuff = [
  []
];

function getAnyScramble(_ep: any, _eo: any, _cp: number, _co: number, _rndapp?: any, _rndpre?: any) {
  initMove();
  _rndapp = _rndapp || emptysuff;
  _rndpre = _rndpre || emptysuff;
  let $_ep = parseMask(_ep, 12);
  let $_eo = parseMask(_eo, 12);
  let $_cp = parseMask(_cp, 8);
  let $_co = parseMask(_co, 8);
  let solution = "";
  do {
    let eo = $_eo.slice();
    let ep = $_ep.slice();
    let co = $_co.slice();
    let cp = $_cp.slice();
    let neo = fixOri(eo, cntU(eo), 2);
    let nco = fixOri(co, cntU(co), 3);
    let nep, ncp;
    let ue = cntU(ep);
    let uc = cntU(cp);
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
    let cc2 = new CubieCube;
    let rndpre = rndEl(_rndpre);
    let rndapp = rndEl(_rndapp);
    for (let i = 0; i < rndpre.length; i++) {
      CornMult(moveCube[rndpre[i]], cc, cc2);
      EdgeMult(moveCube[rndpre[i]], cc, cc2);
      let tmp = cc2;
      cc2 = cc;
      cc = tmp;
    }
    for (let i = 0; i < rndapp.length; i++) {
      CornMult(cc, moveCube[rndapp[i]], cc2);
      EdgeMult(cc, moveCube[rndapp[i]], cc2);
      let tmp = cc2;
      cc2 = cc;
      cc = tmp;
    }
    let posit = toFaceCube(cc);
    // @ts-ignore
    let search0 = new Search();
    solution = search0.solution(posit, 21, 1e9, 50, 2);
  } while (solution.length <= 3);
  return solution.replace(/ +/g, ' ');
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

let f2l_map: any[] = [
  0x2000, // Easy-01
  0x1011, // Easy-02
  0x2012, // Easy-03
  0x1003, // Easy-04
  0x2003, // RE-05
  0x1012, // RE-06
  0x2002, // RE-07
  0x1013, // RE-08
  0x2013, // REFC-09
  0x1002, // REFC-10
  0x2010, // REFC-11
  0x1001, // REFC-12
  0x2011, // REFC-13
  0x1000, // REFC-14
  0x2001, // SPGO-15
  0x1010, // SPGO-16
  0x0000, // SPGO-17
  0x0011, // SPGO-18
  0x0003, // PMS-19
  0x0012, // PMS-20
  0x0002, // PMS-21
  0x0013, // PMS-22
  0x0001, // Weird-23
  0x0010, // Weird-24
  0x0400, // CPEU-25
  0x0411, // CPEU-26
  0x1400, // CPEU-27
  0x2411, // CPEU-28
  0x1411, // CPEU-29
  0x2400, // CPEU-30
  0x0018, // EPCU-31
  0x0008, // EPCU-32
  0x2008, // EPCU-33
  0x1008, // EPCU-34
  0x2018, // EPCU-35
  0x1018, // EPCU-36
  0x0418, // ECP-37
  0x1408, // ECP-38
  0x2408, // ECP-39
  0x1418, // ECP-40
  0x2418, // ECP-41
  0x0408	// Solved-42
];

let f2lprobs = [
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 1, 1
];

let f2lfilter = [
  'Easy-01', 'Easy-02', 'Easy-03', 'Easy-04', 'RE-05', 'RE-06', 'RE-07', 'RE-08', 'REFC-09', 'REFC-10', 'REFC-11', 'REFC-12', 'REFC-13', 'REFC-14', 'SPGO-15', 'SPGO-16', 'SPGO-17', 'SPGO-18', 'PMS-19', 'PMS-20', 'PMS-21', 'PMS-22', 'Weird-23', 'Weird-24', 'CPEU-25', 'CPEU-26', 'CPEU-27', 'CPEU-28', 'CPEU-29', 'CPEU-30', 'EPCU-31', 'EPCU-32', 'EPCU-33', 'EPCU-34', 'EPCU-35', 'EPCU-36', 'ECP-37', 'ECP-38', 'ECP-39', 'ECP-40', 'ECP-41', 'Solved-42'
];

export function getLSLLScramble(type: any, length: any, cases: any) {
  let caze = f2l_map[ fixCase(cases, f2lprobs) ];
  let ep = Math.pow(16, caze & 0xf);
  let eo = 0xf ^ (caze >> 4 & 1);
  let cp = Math.pow(16, caze >> 8 & 0xf);
  let co = 0xf ^ (caze >> 12 & 3);
  return getAnyScramble(0xba9f7654ffff - 7 * ep, 0x000f0000ffff - eo * ep, 0x765fffff - 0xb * cp, 0x000fffff - co * cp);
}

export function getF2LScramble() {
  return getAnyScramble(0xffff7654ffff, 0xffff0000ffff, 0xffffffff, 0xffffffff);
}

let zbll_map = [
  [0x3210, 0x2121], // H-BBFF
  [0x3012, 0x2121], // H-FBFB
  [0x3120, 0x2121], // H-RFLF
  [0x3201, 0x2121], // H-RLFF
  [0x3012, 0x1020], // L-FBRL
  [0x3021, 0x1020], // L-LBFF
  [0x3201, 0x1020], // L-LFFB
  [0x3102, 0x1020], // L-LFFR
  [0x3210, 0x1020], // L-LRFF
  [0x3120, 0x1020], // L-RFBL
  [0x3102, 0x1122], // Pi-BFFB
  [0x3120, 0x1122], // Pi-FBFB
  [0x3012, 0x1122], // Pi-FRFL
  [0x3021, 0x1122], // Pi-FRLF
  [0x3210, 0x1122], // Pi-LFRF
  [0x3201, 0x1122], // Pi-RFFL
  [0x3120, 0x2220], // S-FBBF
  [0x3102, 0x2220], // S-FBFB
  [0x3210, 0x2220], // S-FLFR
  [0x3201, 0x2220], // S-FLRF
  [0x3021, 0x2220], // S-LFFR
  [0x3012, 0x2220], // S-LFRF
  [0x3210, 0x2100], // T-BBFF
  [0x3012, 0x2100], // T-FBFB
  [0x3201, 0x2100], // T-FFLR
  [0x3120, 0x2100], // T-FLFR
  [0x3102, 0x2100], // T-RFLF
  [0x3021, 0x2100], // T-RLFF
  [0x3021, 0x1200], // U-BBFF
  [0x3201, 0x1200], // U-BFFB
  [0x3012, 0x1200], // U-FFLR
  [0x3120, 0x1200], // U-FRLF
  [0x3102, 0x1200], // U-LFFR
  [0x3210, 0x1200], // U-LRFF
  [0x3102, 0x1101], // aS-FBBF
  [0x3120, 0x1101], // aS-FBFB
  [0x3012, 0x1101], // aS-FRFL
  [0x3021, 0x1101], // aS-FRLF
  [0x3210, 0x1101], // aS-LFRF
  [0x3201, 0x1101], // aS-RFFL
  [0xffff, 0x0000] // PLL
];

let zbprobs = [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3];

let zbfilter = ['H-BBFF', 'H-FBFB', 'H-RFLF', 'H-RLFF', 'L-FBRL', 'L-LBFF', 'L-LFFB', 'L-LFFR', 'L-LRFF', 'L-RFBL', 'Pi-BFFB', 'Pi-FBFB', 'Pi-FRFL', 'Pi-FRLF', 'Pi-LFRF', 'Pi-RFFL', 'S-FBBF', 'S-FBFB', 'S-FLFR', 'S-FLRF', 'S-LFFR', 'S-LFRF', 'T-BBFF', 'T-FBFB', 'T-FFLR', 'T-FLFR', 'T-RFLF', 'T-RLFF', 'U-BBFF', 'U-BFFB', 'U-FFLR', 'U-FRLF', 'U-LFFR', 'U-LRFF', 'aS-FBBF', 'aS-FBFB', 'aS-FRFL', 'aS-FRLF', 'aS-LFRF', 'aS-RFFL', 'PLL'];

let coll_map: any[] = [
  [0x3210, 0x2121, 'FeFeeeBeBLGRDGDRGLDGD', 2, 'H-1'],
  [0x2301, 0x1212, 'ReLeeeReLBGBDGDFGFDGD', 2, 'H-2'],
  [0x1203, 0x1212, 'ReBeeeLeBFGRDGDLGFDGD', 4, 'H-3'],
  [0x2013, 0x1212, 'LeReeeFeFRGLDGDBGBDGD', 4, 'H-4'],
  [0x3021, 0x1020, 'DeLeeeReDBGRFGBDGFLGD', 4, 'L-1'],
  [0x1203, 0x0201, 'DeReeeLeDFDBRDFDGLBGD', 4, 'L-2'],
  [0x2301, 0x0102, 'DeBeeeLeDFGRFGRDGLBGD', 4, 'L-3'],
  [0x3210, 0x1020, 'DeLeeeFeDRGFLGBDGBRGD', 4, 'L-4'],
  [0x3102, 0x1020, 'DeLeeeLeDFGBRGBDGRFGD', 4, 'L-5'],
  [0x2013, 0x0201, 'DeReeeReDBGLBGFDGFLGD', 4, 'L-6'],
  [0x3210, 0x1122, 'LeFeeeReFBGDRGLDGBDGD', 4, 'Pi-1'],
  [0x2301, 0x2112, 'FeLeeeFeRRGDBGBDGLDGD', 4, 'Pi-2'],
  [0x1203, 0x1221, 'ReLeeeReLBGDFGBDGFDGD', 4, 'Pi-3'],
  [0x3102, 0x1122, 'BeFeeeFeBRGDLGLDGRDGD', 4, 'Pi-4'],
  [0x2013, 0x1221, 'BeLeeeLeFFGDRGBDGRDGD', 4, 'Pi-5'],
  [0x3021, 0x1122, 'BeReeeLeBFGDLGFDGRDGD', 4, 'Pi-6'],
  [0x3210, 0x2220, 'ReBeeeFeDRGFLGDLGDBGD', 4, 'S-1'],
  [0x2301, 0x0222, 'BeReeeLeDFGRFGDBGDLGD', 4, 'S-2'],
  [0x3021, 0x2220, 'BeReeeFeDRGFLGDBGDLGD', 4, 'S-3'],
  [0x2013, 0x2202, 'ReBeeeLeDFGRFGDLGDBGD', 4, 'S-4'],
  [0x3102, 0x2220, 'FeBeeeLeDFGBRGDLGDRGD', 4, 'S-5'],
  [0x1203, 0x2202, 'LeReeeFeDRGLBGDBGDFGD', 4, 'S-6'],
  [0x1203, 0x1002, 'BeLeeeDeDBGRFGDFGRDGL', 4, 'T-1'],
  [0x3102, 0x2100, 'ReBeeeDeDLGBRGDLGFDGF', 4, 'T-2'],
  [0x2301, 0x0210, 'BeFeeeDeDBGFLGDRGRDGL', 4, 'T-3'],
  [0x3210, 0x2100, 'FeFeeeDeDBGBRGDRGLDGL', 4, 'T-4'],
  [0x2013, 0x1002, 'BeBeeeDeDLGRFGDLGRDGF', 4, 'T-5'],
  [0x3021, 0x2100, 'FeBeeeDeDRGRFGDLGLDGB', 4, 'T-6'],
  [0x2301, 0x0120, 'LeLeeeDeDFGBRGBDGDFGR', 4, 'U-1'],
  [0x3210, 0x1200, 'LeReeeDeDBGBRGFDGDFGL', 4, 'U-2'],
  [0x3021, 0x1200, 'FeFeeeDeDBGBRGLDGDRGL', 4, 'U-3'],
  [0x2013, 0x2001, 'BeFeeeDeDFGBRGLDGDLGR', 4, 'U-4'],
  [0x1203, 0x2001, 'ReFeeeDeDBGRFGLDGDBGL', 4, 'U-5'],
  [0x3102, 0x1200, 'LeBeeeDeDBGRFGRDGDFGL', 4, 'U-6'],
  [0x3210, 0x1101, 'LeFeeeDeRRGFDGLDGBDGB', 4, 'aS-1'],
  [0x2301, 0x1110, 'ReFeeeDeLRGBDGLDGFDGB', 4, 'aS-2'],
  [0x3021, 0x1101, 'LeBeeeDeFFGLDGRDGBDGR', 4, 'aS-3'],
  [0x2013, 0x1011, 'LeFeeeDeBFGRDGLDGBDGR', 4, 'aS-4'],
  [0x1203, 0x1011, 'FeBeeeDeLFGBDGRDGLDGR', 4, 'aS-5'],
  [0x3102, 0x1101, 'FeBeeeDeRBGFDGRDGLDGL', 4, 'aS-6'],
  [0x3021, 0x0000, 'DeDeeeDeDBGRFGBRGFLGL', 4, 'O-Adj'],
  [0x2301, 0x0000, 'DeDeeeDeDBGFLGRFGBRGL', 1, 'O-Diag'],
  [0x3210, 0x0000, 'DeDeeeDeDBGBRGRFGFLGL', 1, 'O-AUF']
];

let coprobs = idxArray(coll_map, 3);
let cofilter = idxArray(coll_map, 4);

export function getZBLLScramble(type: any, length: any, cases: any) {
  let zbcase = zbll_map[fixCase(cases, zbprobs)];
  return getAnyScramble(0xba987654ffff, 0, zbcase[0] + 0x76540000, zbcase[1], aufsuff, aufsuff);
}

export function getZZLLScramble() {
  return getAnyScramble(0xba9876543f1f, 0x000000000000, 0x7654ffff, 0x0000ffff, aufsuff);
}

export function getZBLSScramble() {
  return getAnyScramble(0xba9f7654ffff, 0x000000000000, 0x765fffff, 0x000fffff);
}

export function getLSEScramble() {
  let rnd4 = rn(4);
  return getAnyScramble(0xba98f6f4ffff, 0x0000f0f0ffff, 0x76543210, 0x00000000, [rlpresuff[rnd4]], aufsuff) + rlappsuff[rnd4];
}

let cmll_map = [
  0x0000, // O or solved
  0x1212, // H
  0x0102, // L
  0x1122, // Pi
  0x0222, // S
  0x0021, // T
  0x0012, // U
  0x0111 // aS
];
let cmprobs = [6, 12, 24, 24, 24, 24, 24, 24];
let cmfilter = ['O', 'H', 'L', 'Pi', 'S', 'T', 'U', 'aS'];

export function getCMLLScramble(type: any, length: any, cases: any) {
  let rnd4 = rn(4);
  let presuff = [];
  for (let i = 0; i < aufsuff.length; i++) {
    presuff.push(aufsuff[i].concat(rlpresuff[rnd4]));
  }
  return getAnyScramble(0xba98f6f4ffff, 0x0000f0f0ffff, 0x7654ffff, cmll_map[fixCase(cases, cmprobs)], presuff, aufsuff) + rlappsuff[rnd4];
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

let pll_map = [
  [0x1032, 0x3210], // H
  [0x3102, 0x3210], // Ua
  [0x3021, 0x3210], // Ub
  [0x2301, 0x3210], // Z
  [0x3210, 0x3021], // Aa
  [0x3210, 0x3102], // Ab
  [0x3210, 0x2301], // E
  [0x3012, 0x3201], // F
  [0x2130, 0x3021], // Gb
  [0x1320, 0x3102], // Ga
  [0x3021, 0x3102], // Gc
  [0x3102, 0x3021], // Gd
  [0x3201, 0x3201], // Ja
  [0x3120, 0x3201], // Jb
  [0x1230, 0x3012], // Na
  [0x3012, 0x3012], // Nb
  [0x0213, 0x3201], // Ra
  [0x2310, 0x3201], // Rb
  [0x1230, 0x3201], // T
  [0x3120, 0x3012], // V
  [0x3201, 0x3012] // Y
];

let pllprobs = [
  1, 4, 4, 2,
  4, 4, 2, 4,
  4, 4, 4, 4,
  4, 4, 1, 1,
  4, 4, 4, 4, 4
];

export let pllfilter = [
  'H', 'Ua', 'Ub', 'Z',
  'Aa', 'Ab', 'E', 'F',
  'Ga', 'Gb', 'Gc', 'Gd',
  'Ja', 'Jb', 'Na', 'Nb',
  'Ra', 'Rb', 'T', 'V', 'Y'
];

export function getPLLScramble(type: any, length: any, cases: any) {
  let pllcase = pll_map[fixCase(cases, pllprobs)];
  return getAnyScramble(pllcase[0] + 0xba9876540000, 0x000000000000, pllcase[1] + 0x76540000, 0x00000000, aufsuff, aufsuff);
}

let oll_map = [
  [0x0000, 0x0000], // PLL
  [0x1111, 0x1212], // Point-1
  [0x1111, 0x1122], // Point-2
  [0x1111, 0x0222], // Point-3
  [0x1111, 0x0111], // Point-4
  [0x0011, 0x2022], // Square-5
  [0x0011, 0x1011], // Square-6
  [0x0011, 0x2202], // SLBS-7
  [0x0011, 0x0111], // SLBS-8
  [0x0011, 0x1110], // Fish-9
  [0x0011, 0x2220], // Fish-10
  [0x0011, 0x0222], // SLBS-11
  [0x0011, 0x1101], // SLBS-12
  [0x0101, 0x2022], // Knight-13
  [0x0101, 0x0111], // Knight-14
  [0x0101, 0x0222], // Knight-15
  [0x0101, 0x1011], // Knight-16
  [0x1111, 0x0102], // Point-17
  [0x1111, 0x0012], // Point-18
  [0x1111, 0x0021], // Point-19
  [0x1111, 0x0000], // CO-20
  [0x0000, 0x1212], // OCLL-21
  [0x0000, 0x1122], // OCLL-22
  [0x0000, 0x0012], // OCLL-23
  [0x0000, 0x0021], // OCLL-24
  [0x0000, 0x0102], // OCLL-25
  [0x0000, 0x0111], // OCLL-26
  [0x0000, 0x0222], // OCLL-27
  [0x0011, 0x0000], // CO-28
  [0x0011, 0x0210], // Awkward-29
  [0x0011, 0x2100], // Awkward-30
  [0x0011, 0x0021], // P-31
  [0x0011, 0x1002], // P-32
  [0x0101, 0x0021], // T-33
  [0x0101, 0x0210], // C-34
  [0x0011, 0x1020], // Fish-35
  [0x0011, 0x0102], // W-36
  [0x0011, 0x2010], // Fish-37
  [0x0011, 0x0201], // W-38
  [0x0101, 0x1020], // BLBS-39
  [0x0101, 0x0102], // BLBS-40
  [0x0011, 0x1200], // Awkward-41
  [0x0011, 0x0120], // Awkward-42
  [0x0011, 0x0012], // P-43
  [0x0011, 0x2001], // P-44
  [0x0101, 0x0012], // T-45
  [0x0101, 0x0120], // C-46
  [0x0011, 0x1221], // L-47
  [0x0011, 0x1122], // L-48
  [0x0011, 0x2112], // L-49
  [0x0011, 0x2211], // L-50
  [0x0101, 0x1221], // I-51
  [0x0101, 0x1122], // I-52
  [0x0011, 0x2121], // L-53
  [0x0011, 0x1212], // L-54
  [0x0101, 0x2121], // I-55
  [0x0101, 0x1212], // I-56
  [0x0101, 0x0000], // CO-57
];
let ollprobs = [1, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2];
let ollfilter = ['PLL', 'Point-1', 'Point-2', 'Point-3', 'Point-4', 'Square-5', 'Square-6', 'SLBS-7', 'SLBS-8', 'Fish-9', 'Fish-10', 'SLBS-11', 'SLBS-12', 'Knight-13', 'Knight-14', 'Knight-15', 'Knight-16', 'Point-17', 'Point-18', 'Point-19', 'CO-20', 'OCLL-21', 'OCLL-22', 'OCLL-23', 'OCLL-24', 'OCLL-25', 'OCLL-26', 'OCLL-27', 'CO-28', 'Awkward-29', 'Awkward-30', 'P-31', 'P-32', 'T-33', 'C-34', 'Fish-35', 'W-36', 'Fish-37', 'W-38', 'BLBS-39', 'BLBS-40', 'Awkward-41', 'Awkward-42', 'P-43', 'P-44', 'T-45', 'C-46', 'L-47', 'L-48', 'L-49', 'L-50', 'I-51', 'I-52', 'L-53', 'L-54', 'I-55', 'I-56', 'CO-57'];

export function getOLLScramble(type: any, length: any, cases: any) {
  let ollcase = oll_map[fixCase(cases, ollprobs)];
  return getAnyScramble(0xba987654ffff, ollcase[0], 0x7654ffff, ollcase[1], aufsuff, aufsuff);
}

export function getEOLineScramble() {
  return getAnyScramble(0xffff7f5fffff, 0x000000000000, 0xffffffff, 0xffffffff);
}

export function getEasyCrossScramble(type: any, length: any) {
  let cases = getEasyCross(length);
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

let daufsuff = [[], [Dx1], [Dx2], [Dx3]];
let daufrot = ["", "y", "y2", "y'"];

function getMehta3QBScramble() {
  let rnd4 = rn(4);
  return getAnyScramble(0xffff765fffff, 0xffff000fffff, 0xf65fffff, 0xf00fffff, [daufsuff[rnd4]]) + daufrot[rnd4];
}

function getMehtaEOLEScramble() {
  let skip = rn(4);
  let rnd4 = rn(4);
  return getAnyScramble(0xba98765fffff + (0x4567 & (0xf << skip * 4)) * 0x100000000, 0x0000000fffff + (0xf << skip * 4) * 0x100000000, 0xf65fffff, 0xf00fffff, [daufsuff[rnd4]]) + daufrot[rnd4];
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

let customfilter = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'RF', 'LF', 'LB', 'RB', 'URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
for (let i = 0; i < 20; i++) {
  let piece = customfilter[i];
  customfilter[i + 20] = (piece.length == 2 ? 'OriE-' : 'OriC-') + piece;
  customfilter[i] = (piece.length == 2 ? 'PermE-' : 'PermC-') + piece;
}
let customprobs = valuedArray(40, 0);

let ttll_map: { 0: number, 1: number, 2: string }[] = [
  [0x32410, 0x3210, 'FBar-1'],
  [0x32410, 0x3102, 'FBar-2'],
  [0x32410, 0x3021, 'FBar-3'],
  [0x32410, 0x2301, 'FBar-4'],
  [0x32410, 0x2130, 'FBar-5'],
  [0x32410, 0x2013, 'FBar-6'],
  [0x32410, 0x1320, 'FBar-7'],
  [0x32410, 0x1203, 'FBar-8'],
  [0x32410, 0x1032, 'FBar-9'],
  [0x32410, 0x0312, 'FBar-10'],
  [0x32410, 0x0231, 'FBar-11'],
  [0x32410, 0x0123, 'FBar-12'],
  [0x32401, 0x3201, '2Opp-1'],
  [0x32401, 0x3120, '2Opp-2'],
  [0x32401, 0x3012, '2Opp-3'],
  [0x32401, 0x2310, '2Opp-4'],
  [0x32401, 0x2103, '2Opp-5'],
  [0x32401, 0x2031, '2Opp-6'],
  [0x32401, 0x1302, '2Opp-7'],
  [0x32401, 0x1230, '2Opp-8'],
  [0x32401, 0x1023, '2Opp-9'],
  [0x32401, 0x0321, '2Opp-10'],
  [0x32401, 0x0213, '2Opp-11'],
  [0x32401, 0x0132, '2Opp-12'],
  [0x31420, 0x3201, 'ROpp-1'],
  [0x31420, 0x3120, 'ROpp-2'],
  [0x31420, 0x3012, 'ROpp-3'],
  [0x31420, 0x2310, 'ROpp-4'],
  [0x31420, 0x2103, 'ROpp-5'],
  [0x31420, 0x2031, 'ROpp-6'],
  [0x31420, 0x1302, 'ROpp-7'],
  [0x31420, 0x1230, 'ROpp-8'],
  [0x31420, 0x1023, 'ROpp-9'],
  [0x31420, 0x0321, 'ROpp-10'],
  [0x31420, 0x0213, 'ROpp-11'],
  [0x31420, 0x0132, 'ROpp-12'],
  [0x31402, 0x3210, 'RBar-1'],
  [0x31402, 0x3102, 'RBar-2'],
  [0x31402, 0x3021, 'RBar-3'],
  [0x31402, 0x2301, 'RBar-4'],
  [0x31402, 0x2130, 'RBar-5'],
  [0x31402, 0x2013, 'RBar-6'],
  [0x31402, 0x1320, 'RBar-7'],
  [0x31402, 0x1203, 'RBar-8'],
  [0x31402, 0x1032, 'RBar-9'],
  [0x31402, 0x0312, 'RBar-10'],
  [0x31402, 0x0231, 'RBar-11'],
  [0x31402, 0x0123, 'RBar-12'],
  [0x30421, 0x3210, '2Bar-1'],
  [0x30421, 0x3102, '2Bar-2'],
  [0x30421, 0x3021, '2Bar-3'],
  [0x30421, 0x2301, '2Bar-4'],
  [0x30421, 0x2130, '2Bar-5'],
  [0x30421, 0x2013, '2Bar-6'],
  [0x30421, 0x1320, '2Bar-7'],
  [0x30421, 0x1203, '2Bar-8'],
  [0x30421, 0x1032, '2Bar-9'],
  [0x30421, 0x0312, '2Bar-10'],
  [0x30421, 0x0231, '2Bar-11'],
  [0x30421, 0x0123, '2Bar-12'],
  [0x30412, 0x3201, 'FOpp-1'],
  [0x30412, 0x3120, 'FOpp-2'],
  [0x30412, 0x3012, 'FOpp-3'],
  [0x30412, 0x2310, 'FOpp-4'],
  [0x30412, 0x2103, 'FOpp-5'],
  [0x30412, 0x2031, 'FOpp-6'],
  [0x30412, 0x1302, 'FOpp-7'],
  [0x30412, 0x1230, 'FOpp-8'],
  [0x30412, 0x1023, 'FOpp-9'],
  [0x30412, 0x0321, 'FOpp-10'],
  [0x30412, 0x0213, 'FOpp-11'],
  [0x30412, 0x0132, 'FOpp-12']
];

let ttllprobs: number[] = [];
let ttllfilter: string[] = [];
for (let i = 0; i < ttll_map.length; i++) {
  ttllprobs[i] = 1;
  ttllfilter[i] = ttll_map[i][2];
}

function getTTLLScramble(type: any, length: any, cases: any) {
  let ttllcase = ttll_map[ fixCase(cases, ttllprobs) ];
  return getAnyScramble(0xba9876540000 + ttllcase[1], 0x000000000000, 0x76500000 + ttllcase[0], 0x00000000, aufsuff, aufsuff);
}

let eols_map: number[] = [];
let eolsprobs: any[] = [];
let eolsfilter = [];

for (let i = 0; i < f2l_map.length; i++) {
  if (f2l_map[i][0] & 0xf0) {
    continue;
  }
  eols_map.push(f2l_map[i]);
  eolsprobs.push(f2lprobs[i]);
  eolsfilter.push(f2lfilter[i]);
}

function getEOLSScramble(type: any, length: any, cases: any) {
  let caze = eols_map[ fixCase(cases, eolsprobs)];
  let ep = Math.pow(16, caze & 0xf);
  let cp = Math.pow(16, caze >> 8 & 0xf);
  let co = 0xf ^ (caze >> 12 & 3);
  return getAnyScramble(0xba9f7654ffff - 7 * ep, 0x000000000000, 0x765fffff - 0xb * cp, 0x000fffff - co * cp, aufsuff);
}

let wvls_map: number[] = [];
let wvlsprobs: any[] = [];
let wvlsfilter = [
  'Oriented', 'Rectangle-1', 'Rectangle-2', 'Tank-1', 'Bowtie-1', 'Bowtie-3', 'Tank-2', 'Bowtie-2', 'Bowtie-4', 'Snake-1', 'Adjacent-1', 'Adjacent-2', 'Gun-Far', 'Sune-1', 'Pi-Near', 'Gun-Back', 'Pi-Front', 'H-Side', 'Snake-2', 'Adjacent-3', 'Adjacent-4', 'Gun-Sides', 'H-Front', 'Pi-Back', 'Gun-Near', 'Pi-Far', 'Sune-2'
];

for (let i = 0; i < 27; i++) {
  wvls_map[i] = ~~(i / 9) << 12 | ~~(i / 3) % 3 << 8 | i % 3;
  wvlsprobs[i] = 1;
}

function getWVLSScramble(type: any, length: any, cases: any) {
  let caze = wvls_map[fixCase(cases, wvlsprobs)];
  return getAnyScramble(0xba9f7654ff8f, 0x000000000000, 0x765fff4f, 0x000f0020 | caze);
}

let vls_map: number[][] = [];
let vlsprobs: any[] = [];
let vlsfilter = [];

for (let i = 0; i < 27 * 8; i++) {
  let co = i % 27;
  let eo = ~~(i / 27);
  vls_map[i] = [~~(co / 9) % 3 << 12 | ~~(co / 3) % 3 << 8 | co % 3, (eo >> 2 & 1) << 12 | (eo >> 1 & 1) << 8 | eo & 1];
  vlsprobs[i] = 1;
  vlsfilter[i] = ["WVLS", "UB", "UF", "UF UB", "UL", "UB UL", "UF UL", "No Edge"][eo] + "-" + (co + 1);
}

function getVLSScramble(type: any, length: any, cases: any) {
  let caze = vls_map[fixCase(cases, vlsprobs)];
  return getAnyScramble(0xba9f7654ff8f, 0x000f00000000 + caze[1], 0x765fff4f, 0x000f0020 + caze[0], [[Ux3]]);
}

function getSBRouxScramble() {
  let rnd4 = rn(4);
  return getAnyScramble(0xfa9ff6ffffff, 0xf00ff0ffffff, 0xf65fffff, 0xf00fffff, [rlpresuff[rnd4]]) + rlappsuff[rnd4];
}

function getEasyXCrossScramble(type: any, length: any) {
  let cases: any = getEasyXCross(length);
  return getAnyScramble(cases[0], cases[1], cases[2], cases[3]);
}

regScrambler('333', getRandomScramble)
  ('333oh', getRandomScramble)
  ('333ft', getRandomScramble)
  ('333fm', getFMCScramble)
  ('edges', getEdgeScramble)
  ('corners', getCornerScramble)
  ('ll', getLLScramble)
  ('lsll2', getLSLLScramble, [f2lfilter, f2lprobs])
  ('f2l', getF2LScramble)
  ('zbll', getZBLLScramble, [zbfilter, zbprobs])
  ('zzll', getZZLLScramble)
  ('zbls', getZBLSScramble)
  ('lse', getLSEScramble)
  ('cmll', getCMLLScramble, [cmfilter, cmprobs])
  ('cll', getCLLScramble)
  ('ell', getELLScramble)
  ('pll', getPLLScramble, [pllfilter, pllprobs])
  ('oll', getOLLScramble, [ollfilter, ollprobs])
  ('2gll', get2GLLScramble)
  ('easyc', getEasyCrossScramble)
  ('eoline', getEOLineScramble)

  ('333custom', getCustomScramble, [customfilter, customprobs])
  ('ttll', getTTLLScramble, [ttllfilter, ttllprobs])
  ('eols', getEOLSScramble, [eolsfilter, eolsprobs])
  ('wvls', getWVLSScramble, [wvlsfilter, wvlsprobs])
  ('vls', getVLSScramble, [vlsfilter, vlsprobs])
  ('coll', getZBLLScramble, [cofilter, coprobs])
  ('sbrx', getSBRouxScramble)
  ('mt3qb', getMehta3QBScramble)
  ('mteole', getMehtaEOLEScramble)
  ('mttdr', getMehtaTDRScramble)
  ('mt6cp', getMehta6CPScramble)
  ('mtl5ep', getMehtaL5EPScramble)
  ('mtcdrll', getMehtaCDRLLScramble)
  ('easyxc', getEasyXCrossScramble);