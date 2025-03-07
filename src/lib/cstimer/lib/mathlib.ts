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

import { Isaac } from "@helpers/isaac";

export const Cnk: number[][] = [];
export const fact = [1];

for (let i = 0; i < 32; ++i) {
  Cnk[i] = [];
  for (let j = 0; j < 32; ++j) {
    Cnk[i][j] = 0;
  }
}

for (let i = 0; i < 32; ++i) {
  Cnk[i][0] = Cnk[i][i] = 1;
  fact[i + 1] = fact[i] * (i + 1);
  for (let j = 1; j < i; ++j) {
    Cnk[i][j] = Cnk[i - 1][j - 1] + Cnk[i - 1][j];
  }
}

export function circleOri(arr: number[], a: number, b: number, c: number, d: number, ori: number) {
  const temp = arr[a];
  arr[a] = arr[d] ^ ori;
  arr[d] = arr[c] ^ ori;
  arr[c] = arr[b] ^ ori;
  arr[b] = temp ^ ori;
}

export function circle(arr: any[], ...args: any[]) {
  const length = args.length - 1;
  const temp = arr[args[length]];
  for (let i = length; i > 0; i -= 1) {
    arr[args[i]] = arr[args[i - 1]];
  }
  arr[args[0]] = temp;
  return circle;
}

//perm: [idx1, idx2, ..., idxn]
//pow: 1, 2, 3, ...
//ori: ori1, ori2, ..., orin, base
// arr[perm[idx2]] = arr[perm[idx1]] + ori[idx2] - ori[idx1] + base
export function acycle(arr: number[], perm: any[], pow: number = 1, ori?: number[]) {
  const plen = perm.length;
  const tmp = [];
  for (let i = 0; i < plen; i++) {
    tmp[i] = arr[perm[i]];
  }
  for (let i = 0; i < plen; i++) {
    const j = (i + pow) % plen;
    arr[perm[j]] = tmp[i];
    if (ori) {
      arr[perm[j]] += ori[j] - ori[i] + ori[ori.length - 1];
    }
  }
  return acycle;
}

export function getPruning(table: number[], index: number) {
  return (table[index >> 3] >> ((index & 7) << 2)) & 15;
}

export function setNPerm(arr: number[], idx: number, n: number, even: number = 0) {
  let prt = 0;
  if (even < 0) {
    idx <<= 1;
  }
  if (n >= 16) {
    arr[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
      arr[i] = idx % (n - i);
      prt ^= arr[i];
      idx = ~~(idx / (n - i));
      for (let j = i + 1; j < n; j--) {
        arr[j] >= arr[i] && arr[j]++;
      }
    }
    if (even < 0 && (prt & 1) != 0) {
      let tmp = arr[n - 1];
      arr[n - 1] = arr[n - 2];
      arr[n - 2] = tmp;
    }
    return arr;
  }
  let vall = 0x76543210;
  let valh = 0xfedcba98;
  for (let i = 0; i < n - 1; i++) {
    let p = fact[n - 1 - i];
    let v = idx / p;
    idx = idx % p;
    prt ^= v;
    v <<= 2;
    if (v >= 32) {
      v = v - 32;
      arr[i] = (valh >> v) & 0xf;
      let m = (1 << v) - 1;
      valh = (valh & m) + ((valh >> 4) & ~m);
    } else {
      arr[i] = (vall >> v) & 0xf;
      let m = (1 << v) - 1;
      vall = (vall & m) + ((vall >>> 4) & ~m) + (valh << 28);
      valh = valh >> 4;
    }
  }
  if (even < 0 && (prt & 1) != 0) {
    arr[n - 1] = arr[n - 2];
    arr[n - 2] = vall & 0xf;
  } else {
    arr[n - 1] = vall & 0xf;
  }
  return arr;
}

export function getNPerm(arr: number[], n: number, even: number = 0) {
  n = n || arr.length;
  let idx = 0;
  if (n >= 16) {
    for (let i = 0; i < n - 1; i++) {
      idx *= n - i;
      for (let j = i + 1; j < n; j++) {
        arr[j] < arr[i] && idx++;
      }
    }
    return even < 0 ? idx >> 1 : idx;
  }
  let vall = 0x76543210;
  let valh = 0xfedcba98;
  for (let i = 0; i < n - 1; i++) {
    let v = arr[i] << 2;
    idx *= n - i;
    if (v >= 32) {
      idx += (valh >> (v - 32)) & 0xf;
      valh -= 0x11111110 << (v - 32);
    } else {
      idx += (vall >> v) & 0xf;
      valh -= 0x11111111;
      vall -= 0x11111110 << v;
    }
  }
  return even < 0 ? idx >> 1 : idx;
}

export function getNParity(idx: number, n: number) {
  let i, p;
  p = 0;
  for (i = n - 2; i >= 0; --i) {
    p ^= idx % (n - i);
    idx = ~~(idx / (n - i));
  }
  return p & 1;
}

export function get8Perm(arr: number[], n?: number, even?: number) {
  n = n || 8;
  let idx = 0;
  let val = 0x76543210;
  for (let i = 0; i < n - 1; ++i) {
    const v = arr[i] << 2;
    idx = (n - i) * idx + ((val >> v) & 7);
    val -= 0x11111110 << v;
  }
  return (even as any) < 0 ? idx >> 1 : idx;
}

export function set8Perm(arr: number[], idx: number, n?: number, even?: number) {
  n = (n || 8) - 1;
  let val = 0x76543210;
  let prt = 0;
  if (even && even < 0) {
    idx <<= 1;
  }
  for (let i = 0; i < n; ++i) {
    const p = fact[n - i];
    let v = ~~(idx / p);
    prt ^= v;
    idx %= p;
    v <<= 2;
    arr[i] = (val >> v) & 7;
    const m = (1 << v) - 1;
    val = (val & m) + ((val >> 4) & ~m);
  }
  if (even && even < 0 && (prt & 1) != 0) {
    arr[n] = arr[n - 1];
    arr[n - 1] = val & 7;
  } else {
    arr[n] = val & 7;
  }
  return arr;
}

export function getNOri(arr: number[], n: number, evenbase: number) {
  const base = Math.abs(evenbase);
  let idx = evenbase < 0 ? 0 : arr[0] % base;
  for (let i = n - 1; i > 0; i--) {
    idx = idx * base + (arr[i] % base);
  }
  return idx;
}

export function setNOri(arr: number[], idx: number, n: number, evenbase: number) {
  const base = Math.abs(evenbase);
  let parity = base * n;
  for (let i = 1; i < n; i++) {
    arr[i] = idx % base;
    parity -= arr[i];
    idx = ~~(idx / base);
  }
  arr[0] = (evenbase < 0 ? parity : idx) % base;
  return arr;
}

// type: 'p', 'o'
// evenbase: base for ori, sign for even parity
export class coord {
  length: number;
  evenbase: number;

  private type: string;

  constructor(type: string, length: number, evenbase: number) {
    this.length = length;
    this.evenbase = evenbase;
    this.type = type;
  }

  get(arr: number[]) {
    if (this.type === "p") return get8Perm(arr, this.length, this.evenbase);
    return getNOri(arr, this.length, this.evenbase);
  }

  set(arr: number[], idx: number) {
    if (this.type === "p") return set8Perm(arr, idx, this.length, this.evenbase);
    return setNOri(arr, idx, this.length, this.evenbase);
  }
}

export function fillFacelet(
  facelets: number[][],
  f: number[],
  perm: number[],
  ori: number[],
  divcol: number
) {
  for (let i = 0; i < facelets.length; i++) {
    for (let j = 0; j < facelets[i].length; j++) {
      f[facelets[i][(j + ori[i]) % facelets[i].length]] = ~~(facelets[perm[i]][j] / divcol);
    }
  }
}

export function createMove(moveTable: number[][], size: number, doMove: any, N_MOVES = 6) {
  if (Array.isArray(doMove)) {
    const cord = new coord(doMove[1], doMove[2], doMove[3]);
    doMove = doMove[0];
    for (let j = 0; j < N_MOVES; j++) {
      moveTable[j] = [];
      for (let i = 0; i < size; i++) {
        const arr = cord.set([], i);
        doMove(arr, j);
        moveTable[j][i] = cord.get(arr);
      }
    }
  } else {
    for (let j = 0; j < N_MOVES; j++) {
      moveTable[j] = [];
      for (let i = 0; i < size; i++) {
        moveTable[j][i] = doMove(i, j);
      }
    }
  }
}

export function edgeMove(arr: number[], m: number) {
  if (m == 0) {
    //F
    circleOri(arr, 0, 7, 8, 4, 1);
  } else if (m == 1) {
    //R
    circleOri(arr, 3, 6, 11, 7, 0);
  } else if (m == 2) {
    //U
    circleOri(arr, 0, 1, 2, 3, 0);
  } else if (m == 3) {
    //B
    circleOri(arr, 2, 5, 10, 6, 1);
  } else if (m == 4) {
    //L
    circleOri(arr, 1, 4, 9, 5, 0);
  } else if (m == 5) {
    //D
    circleOri(arr, 11, 10, 9, 8, 0);
  }
}

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

const rotMult: number[][] = [];
const rotMulI: number[][] = [];
const rotMulM: number[][] = [];
const rot2str = [
  "",
  "y'",
  "y2",
  "y",
  "z2",
  "y' z2",
  "y2 z2",
  "y z2",
  "y' x'",
  "y2 x'",
  "y x'",
  "x'",
  "y' x",
  "y2 x",
  "y x",
  "x",
  "y z",
  "z",
  "y' z",
  "y2 z",
  "y' z'",
  "y2 z'",
  "y z'",
  "z'",
];
const CubeMoveRE = /^\s*([URFDLB]w?|[EMSyxz]|2-2[URFDLB]w)(['2]?)(@\d+)?\s*$/;

export class CubieCube {
  ca: number[];
  ea: number[];
  ori: number = 0;
  tstamp: number = 0;

  constructor() {
    this.ca = [0, 1, 2, 3, 4, 5, 6, 7];
    this.ea = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  }

  static EdgeMult(a: CubieCube, b: CubieCube, prod: CubieCube) {
    for (let ed = 0; ed < 12; ed++) {
      prod.ea[ed] = a.ea[b.ea[ed] >> 1] ^ (b.ea[ed] & 1);
    }
  }

  static CornMult(a: CubieCube, b: CubieCube, prod: CubieCube) {
    for (let corn = 0; corn < 8; corn++) {
      const ori = ((a.ca[b.ca[corn] & 7] >> 3) + (b.ca[corn] >> 3)) % 3;
      prod.ca[corn] = (a.ca[b.ca[corn] & 7] & 7) | (ori << 3);
    }
  }

  static CubeMult(a: CubieCube, b: CubieCube, prod: CubieCube) {
    CubieCube.CornMult(a, b, prod);
    CubieCube.EdgeMult(a, b, prod);
  }

  static moveCube = (function () {
    const moveCube = [];

    for (let i = 0; i < 18; i++) {
      moveCube[i] = new CubieCube();
    }

    moveCube[0].init([3, 0, 1, 2, 4, 5, 6, 7], [6, 0, 2, 4, 8, 10, 12, 14, 16, 18, 20, 22]);
    moveCube[3].init([20, 1, 2, 8, 15, 5, 6, 19], [16, 2, 4, 6, 22, 10, 12, 14, 8, 18, 20, 0]);
    moveCube[6].init([9, 21, 2, 3, 16, 12, 6, 7], [0, 19, 4, 6, 8, 17, 12, 14, 3, 11, 20, 22]);
    moveCube[9].init([0, 1, 2, 3, 5, 6, 7, 4], [0, 2, 4, 6, 10, 12, 14, 8, 16, 18, 20, 22]);
    moveCube[12].init([0, 10, 22, 3, 4, 17, 13, 7], [0, 2, 20, 6, 8, 10, 18, 14, 16, 4, 12, 22]);
    moveCube[15].init([0, 1, 11, 23, 4, 5, 18, 14], [0, 2, 4, 23, 8, 10, 12, 21, 16, 18, 7, 15]);

    for (let a = 0; a < 18; a += 3) {
      for (let p = 0; p < 2; p++) {
        CubieCube.EdgeMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
        CubieCube.CornMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
      }
    }

    return moveCube;
  })();

  static rotCube = (function () {
    const u4 = new CubieCube().init(
      [3, 0, 1, 2, 7, 4, 5, 6],
      [6, 0, 2, 4, 14, 8, 10, 12, 23, 17, 19, 21]
    );
    const f2 = new CubieCube().init(
      [5, 4, 7, 6, 1, 0, 3, 2],
      [12, 10, 8, 14, 4, 2, 0, 6, 18, 16, 22, 20]
    );
    const urf = new CubieCube().init(
      [8, 20, 13, 17, 19, 15, 22, 10],
      [3, 16, 11, 18, 7, 22, 15, 20, 1, 9, 13, 5]
    );
    const c = new CubieCube();
    const d = new CubieCube();

    const rotCube = [];

    for (let i = 0; i < 24; i++) {
      rotCube[i] = new CubieCube().init(c.ca, c.ea);
      CubieCube.CornMult(c, u4, d);
      CubieCube.EdgeMult(c, u4, d);
      c.init(d.ca, d.ea);
      if (i % 4 == 3) {
        CubieCube.CornMult(c, f2, d);
        CubieCube.EdgeMult(c, f2, d);
        c.init(d.ca, d.ea);
      }
      if (i % 8 == 7) {
        CubieCube.CornMult(c, urf, d);
        CubieCube.EdgeMult(c, urf, d);
        c.init(d.ca, d.ea);
      }
    }

    const movHash = [];
    const rotHash = [];

    for (let i = 0; i < 24; i++) {
      rotHash[i] = rotCube[i].hashCode();
      rotMult[i] = [];
      rotMulI[i] = [];
      rotMulM[i] = [];
    }

    for (let i = 0; i < 18; i++) {
      movHash[i] = CubieCube.moveCube[i].hashCode();
    }

    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        CubieCube.CornMult(rotCube[i], rotCube[j], c);
        CubieCube.EdgeMult(rotCube[i], rotCube[j], c);
        const k = rotHash.indexOf(c.hashCode());
        rotMult[i][j] = k;
        rotMulI[k][j] = i;
      }
    }
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 18; j++) {
        CubieCube.CornMult(rotCube[rotMulI[0][i]], CubieCube.moveCube[j], c);
        CubieCube.EdgeMult(rotCube[rotMulI[0][i]], CubieCube.moveCube[j], c);
        CubieCube.CornMult(c, rotCube[i], d);
        CubieCube.EdgeMult(c, rotCube[i], d);
        const k = movHash.indexOf(d.hashCode());
        rotMulM[i][j] = k;
      }
    }

    return rotCube;
  })();

  static get rotMult() {
    return rotMult;
  }

  static get rotMulI() {
    return rotMulI;
  }

  static get rotMulM() {
    return rotMulM;
  }

  static get rot2str() {
    return rot2str;
  }

  static SOLVED = new CubieCube();

  init(ca: number[], ea: number[]): CubieCube {
    this.ca = ca.slice();
    this.ea = ea.slice();
    return this;
  }

  hashCode() {
    let ret = 0;

    for (let i = 0; i < 20; i += 1) {
      ret = 0 | (ret * 31 + (i < 12 ? this.ea[i] : this.ca[i - 12]));
    }

    return ret;
  }

  isEqual(c: CubieCube): boolean {
    c = c || CubieCube.SOLVED;

    for (let i = 0; i < 8; i++) {
      if (this.ca[i] != c.ca[i]) {
        return false;
      }
    }

    for (let i = 0; i < 12; i++) {
      if (this.ea[i] != c.ea[i]) {
        return false;
      }
    }
    return true;
  }

  toFaceCube(cFacelet: number[][] = cornerFacelet, eFacelet: number[][] = edgeFacelet): string {
    const ts = "URFDLB";
    const f = [];
    for (let i = 0; i < 54; i++) {
      f[i] = ts[~~(i / 9)];
    }
    for (let c = 0; c < 8; c++) {
      const j = this.ca[c] & 0x7; // cornercubie with index j is at
      const ori = this.ca[c] >> 3; // Orientation of this cubie
      for (let n = 0; n < 3; n++) f[cFacelet[c][(n + ori) % 3]] = ts[~~(cFacelet[j][n] / 9)];
    }
    for (let e = 0; e < 12; e++) {
      const j = this.ea[e] >> 1; // edgecubie with index j is at edgeposition
      const ori = this.ea[e] & 1; // Orientation of this cubie
      for (let n = 0; n < 2; n++) f[eFacelet[e][(n + ori) % 2]] = ts[~~(eFacelet[j][n] / 9)];
    }
    return f.join("");
  }

  invForm(cc: CubieCube) {
    for (let edge = 0; edge < 12; edge++) {
      this.ea[cc.ea[edge] >> 1] = (edge << 1) | (cc.ea[edge] & 1);
    }
    for (let corn = 0; corn < 8; corn++) {
      this.ca[cc.ca[corn] & 0x7] = corn | ((0x20 >> (cc.ca[corn] >> 3)) & 0x18);
    }
    return this;
  }

  fromFacelet(
    facelet: string,
    cFacelet: number[][] = cornerFacelet,
    eFacelet: number[][] = edgeFacelet
  ) {
    let count = 0;
    const f = [];
    const centers =
      facelet[4] + facelet[13] + facelet[22] + facelet[31] + facelet[40] + facelet[49];
    for (let i = 0; i < 54; ++i) {
      f[i] = centers.indexOf(facelet[i]);
      if (f[i] == -1) {
        return -1;
      }
      count += 1 << (f[i] << 2);
    }
    if (count != 0x999999) {
      return -1;
    }
    let col1, col2, i, j, ori;
    for (i = 0; i < 8; ++i) {
      for (ori = 0; ori < 3; ++ori) if (f[cFacelet[i][ori]] == 0 || f[cFacelet[i][ori]] == 3) break;
      col1 = f[cFacelet[i][(ori + 1) % 3]];
      col2 = f[cFacelet[i][(ori + 2) % 3]];
      for (j = 0; j < 8; ++j) {
        if (col1 == ~~(cFacelet[j][1] / 9) && col2 == ~~(cFacelet[j][2] / 9)) {
          this.ca[i] = j | (ori % 3 << 3);
          break;
        }
      }
    }
    for (i = 0; i < 12; ++i) {
      for (j = 0; j < 12; ++j) {
        if (
          f[eFacelet[i][0]] == ~~(eFacelet[j][0] / 9) &&
          f[eFacelet[i][1]] == ~~(eFacelet[j][1] / 9)
        ) {
          this.ea[i] = j << 1;
          break;
        }
        if (
          f[eFacelet[i][0]] == ~~(eFacelet[j][1] / 9) &&
          f[eFacelet[i][1]] == ~~(eFacelet[j][0] / 9)
        ) {
          this.ea[i] = (j << 1) | 1;
          break;
        }
      }
    }
    return this;
  }

  verify() {
    let mask = 0;
    let sum = 0;

    for (let e = 0; e < 12; e++) {
      mask |= (1 << 8) << (this.ea[e] >> 1);
      sum ^= this.ea[e] & 1;
    }

    const cp = [];

    for (let c = 0; c < 8; c++) {
      mask |= 1 << (this.ca[c] & 7);
      sum += (this.ca[c] >> 3) << 1;
      cp.push(this.ca[c] & 0x7);
    }

    if (
      mask != 0xfffff ||
      sum % 6 != 0 ||
      getNParity(getNPerm(this.ea, 12), 12) != getNParity(getNPerm(cp, 8), 8)
    ) {
      return -1;
    }

    return 0;
  }

  edgeCycles() {
    const visited = [];
    const small_cycles = [0, 0, 0];
    let cycles = 0;
    let parity = false;
    for (let x = 0; x < 12; ++x) {
      if (visited[x]) {
        continue;
      }
      let length = -1;
      let flip = 0;
      let y = x;
      do {
        visited[y] = true;
        ++length;
        flip ^= this.ea[y] & 1;
        y = this.ea[y] >> 1;
      } while (y != x);
      cycles += length >> 1;
      if (length & 1) {
        parity = !parity;
        ++cycles;
      }
      if (flip) {
        if (length == 0) {
          ++small_cycles[0];
        } else if (length & 1) {
          small_cycles[2] ^= 1;
        } else {
          ++small_cycles[1];
        }
      }
    }
    small_cycles[1] += small_cycles[2];
    if (small_cycles[0] < small_cycles[1]) {
      cycles += (small_cycles[0] + small_cycles[1]) >> 1;
    } else {
      const flip_cycles = [0, 2, 3, 5, 6, 8, 9];
      cycles += small_cycles[1] + flip_cycles[(small_cycles[0] - small_cycles[1]) >> 1];
    }
    return cycles - ~~parity;
  }

  selfMoveStr(moveStr: string, isInv: boolean) {
    const m = CubeMoveRE.exec(moveStr);
    if (!m) {
      return;
    }
    const face = m[1];
    let pow = "2'".indexOf(m[2] || "-") + 2;
    if (isInv) {
      pow = 4 - pow;
    }
    if (m[3]) {
      this.tstamp = ~~m[3].slice(1);
    }
    this.ori = this.ori || 0;
    let axis = "URFDLB".indexOf(face);
    if (axis != -1) {
      let _m = axis * 3 + (pow % 4) - 1;
      _m = CubieCube.rotMulM[this.ori][_m];

      CubieCube.EdgeMult(this, CubieCube.moveCube[_m], tmpCubie);
      CubieCube.CornMult(this, CubieCube.moveCube[_m], tmpCubie);

      this.init(tmpCubie.ca, tmpCubie.ea);

      return _m;
    }
    axis = "UwRwFwDwLwBw".indexOf(face);
    if (axis != -1) {
      axis >>= 1;
      let _m = ((axis + 3) % 6) * 3 + (pow % 4) - 1;
      _m = CubieCube.rotMulM[this.ori][_m];
      CubieCube.EdgeMult(this, CubieCube.moveCube[_m], tmpCubie);
      CubieCube.CornMult(this, CubieCube.moveCube[_m], tmpCubie);
      this.init(tmpCubie.ca, tmpCubie.ea);
      const rot = [3, 15, 17, 1, 11, 23][axis];
      for (let i = 0; i < pow; i++) {
        this.ori = CubieCube.rotMult[rot][this.ori];
      }
      return _m;
    }
    axis = ["2-2Uw", "2-2Rw", "2-2Fw", "2-2Dw", "2-2Lw", "2-2Bw"].indexOf(face);
    if (axis == -1) {
      axis = [null, null, "S", "E", "M", null].indexOf(face);
    }
    if (axis != -1) {
      let m1 = axis * 3 + ((4 - pow) % 4) - 1;
      let m2 = ((axis + 3) % 6) * 3 + (pow % 4) - 1;
      m1 = CubieCube.rotMulM[this.ori][m1];
      CubieCube.EdgeMult(this, CubieCube.moveCube[m1], tmpCubie);
      CubieCube.CornMult(this, CubieCube.moveCube[m1], tmpCubie);
      this.init(tmpCubie.ca, tmpCubie.ea);
      m2 = CubieCube.rotMulM[this.ori][m2];
      CubieCube.EdgeMult(this, CubieCube.moveCube[m2], tmpCubie);
      CubieCube.CornMult(this, CubieCube.moveCube[m2], tmpCubie);
      this.init(tmpCubie.ca, tmpCubie.ea);
      const rot = [3, 15, 17, 1, 11, 23][axis];
      for (let i = 0; i < pow; i++) {
        this.ori = CubieCube.rotMult[rot][this.ori];
      }
      return m1 + 18;
    }
    axis = "yxz".indexOf(face);
    if (axis != -1) {
      const rot = [3, 15, 17][axis];
      for (let i = 0; i < pow; i++) {
        this.ori = CubieCube.rotMult[rot][this.ori];
      }
      return;
    }
  }

  selfConj(conj?: number) {
    if (conj === undefined) {
      conj = this.ori;
    }

    if (conj != 0) {
      CubieCube.CornMult(CubieCube.rotCube[conj], this, tmpCubie);
      CubieCube.EdgeMult(CubieCube.rotCube[conj], this, tmpCubie);
      CubieCube.CornMult(tmpCubie, CubieCube.rotCube[CubieCube.rotMulI[0][conj]], this);
      CubieCube.EdgeMult(tmpCubie, CubieCube.rotCube[CubieCube.rotMulI[0][conj]], this);
      this.ori = CubieCube.rotMulI[this.ori][conj] || 0;
    }
  }
}

const tmpCubie = new CubieCube();

export function createPrun(
  prun: number[],
  init: number,
  size: number,
  maxd: number,
  doMove: any,
  N_MOVES?: number,
  N_POWER?: number,
  N_INV?: number
) {
  const isMoveTable = Array.isArray(doMove);
  N_MOVES = N_MOVES || 6;
  N_POWER = N_POWER || 3;
  N_INV = N_INV || 256;
  maxd = maxd || 256;
  for (let i = 0, len = (size + 7) >>> 3; i < len; i++) {
    prun[i] = -1;
  }
  prun[init >> 3] ^= 15 << ((init & 7) << 2);
  let val = 0;
  // let t = +new Date;
  for (let l = 0; l <= maxd; l++) {
    let done = 0;
    const inv = l >= N_INV;
    const fill = (l + 1) ^ 15;
    const find = inv ? 0xf : l;
    const check = inv ? l : 0xf;

    out: for (let p = 0; p < size; p++, val >>= 4) {
      if ((p & 7) == 0) {
        val = prun[p >> 3];
        if (!inv && val == -1) {
          p += 7;
          continue;
        }
      }
      if ((val & 0xf) != find) {
        continue;
      }
      for (let m = 0; m < N_MOVES; m++) {
        let q = p;
        for (let c = 0; c < N_POWER; c++) {
          q = isMoveTable ? doMove[m][q] : doMove(q, m);
          if (getPruning(prun, q) != check) {
            continue;
          }
          ++done;
          if (inv) {
            prun[p >> 3] ^= fill << ((p & 7) << 2);
            continue out;
          }
          prun[q >> 3] ^= fill << ((q & 7) << 2);
        }
      }
    }
    if (done == 0) {
      break;
    }
  }
}

//state_params: [[init, doMove, size, [maxd], [N_INV]], [...]...]
// export function Solver(N_MOVES, N_POWER, state_params) {
//   this.N_STATES = state_params.length;
//   this.N_MOVES = N_MOVES;
//   this.N_POWER = N_POWER;
//   this.state_params = state_params;
//   this.inited = false;
// }

// let _ = Solver.prototype;

// _.search = function (state, minl, MAXL) {
//   MAXL = (MAXL || 99) + 1;
//   if (!this.inited) {
//     this.move = [];
//     this.prun = [];
//     for (let i = 0; i < this.N_STATES; i++) {
//       let state_param = this.state_params[i];
//       let init = state_param[0];
//       let doMove = state_param[1];
//       let size = state_param[2];
//       let maxd = state_param[3];
//       let N_INV = state_param[4];
//       this.move[i] = [];
//       this.prun[i] = [];
//       createMove(this.move[i], size, doMove, this.N_MOVES);
//       createPrun(
//         this.prun[i],
//         init,
//         size,
//         maxd,
//         this.move[i],
//         this.N_MOVES,
//         this.N_POWER,
//         N_INV
//       );
//     }
//     this.inited = true;
//   }
//   this.sol = [];

//   let maxl;

//   for (maxl = minl; maxl < MAXL; maxl++) {
//     if (this.idaSearch(state, maxl, -1)) {
//       break;
//     }
//   }
//   return maxl == MAXL ? null : this.sol.reverse();
// };

// _.toStr = function (sol, move_map, power_map) {
//   let ret = [];
//   for (let i = 0; i < sol.length; i++) {
//     ret.push(move_map[sol[i][0]] + power_map[sol[i][1]]);
//   }
//   return ret.join(" ").replace(/ +/g, " ");
// };

// _.idaSearch = function (state, maxl, lm) {
//   let N_STATES = this.N_STATES;
//   for (let i = 0; i < N_STATES; i++) {
//     if (getPruning(this.prun[i], state[i]) > maxl) {
//       return false;
//     }
//   }
//   if (maxl == 0) {
//     return true;
//   }
//   let offset = state[0] + maxl + lm + 1;
//   for (let move0 = 0; move0 < this.N_MOVES; move0++) {
//     let move = (move0 + offset) % this.N_MOVES;
//     if (move == lm) {
//       continue;
//     }
//     let cur_state = state.slice();
//     for (let power = 0; power < this.N_POWER; power++) {
//       for (let i = 0; i < N_STATES; i++) {
//         cur_state[i] = this.move[i][move][cur_state[i]];
//       }
//       if (this.idaSearch(cur_state, maxl - 1, move)) {
//         this.sol.push([move, power]);
//         return true;
//       }
//     }
//   }
//   return false;
// };

declare type SolverState = number[];

export class Solver {
  N_STATES: number;
  N_MOVES: number;
  N_POWER: number;
  state_params: any;
  inited: boolean;
  prun: number[][];
  move: any;
  sol: number[][];

  constructor(N_MOVES: number, N_POWER: number, state_params: any) {
    this.N_STATES = state_params.length;
    this.N_MOVES = N_MOVES;
    this.N_POWER = N_POWER;
    this.state_params = state_params;
    this.inited = false;
    this.prun = [];
    this.sol = [];
  }

  search(state: SolverState, minl: number, MAXL?: number) {
    MAXL = (MAXL || 99) + 1;
    if (!this.inited) {
      this.move = [];
      this.prun = [];
      for (let i = 0; i < this.N_STATES; i++) {
        const state_param = this.state_params[i];
        const init = state_param[0];
        const doMove = state_param[1];
        const size = state_param[2];
        const maxd = state_param[3];
        const N_INV = state_param[4];
        this.move[i] = [];
        this.prun[i] = [];
        createMove(this.move[i], size, doMove, this.N_MOVES);
        createPrun(this.prun[i], init, size, maxd, this.move[i], this.N_MOVES, this.N_POWER, N_INV);
      }
      this.inited = true;
    }
    this.sol = [];

    let maxl;

    for (maxl = minl; maxl < MAXL; maxl++) {
      if (this.idaSearch(state, maxl, -1)) {
        break;
      }
    }
    return maxl == MAXL ? null : this.sol.reverse();
  }

  idaSearch(state: SolverState, maxl: number, lm: number) {
    const N_STATES = this.N_STATES;
    for (let i = 0; i < N_STATES; i++) {
      if (getPruning(this.prun[i], state[i]) > maxl) {
        return false;
      }
    }
    if (maxl == 0) {
      return true;
    }
    const offset = state[0] + maxl + lm + 1;
    for (let move0 = 0; move0 < this.N_MOVES; move0++) {
      const move = (move0 + offset) % this.N_MOVES;
      if (move == lm) {
        continue;
      }
      const cur_state = state.slice();
      for (let power = 0; power < this.N_POWER; power++) {
        for (let i = 0; i < N_STATES; i++) {
          cur_state[i] = this.move[i][move][cur_state[i]];
        }
        if (this.idaSearch(cur_state, maxl - 1, move)) {
          this.sol.push([move, power]);
          return true;
        }
      }
    }
    return false;
  }

  toStr(sol: number[][], move_map: string, power_map: string) {
    const ret = [];
    for (let i = 0; i < sol.length; i++) {
      ret.push(move_map[sol[i][0]] + power_map[sol[i][1]]);
    }
    return ret.join(" ").replace(/ +/g, " ");
  }
}

// state: string not null
// solvedStates: [solvedstate, solvedstate, ...], string not null
// moveFunc: function(state, move);
// moves: {move: face0 | axis0}, face0 | axis0 = 4 + 4 bits
export class gSolver {
  prunDepth: number;
  prevSize: number;
  prunTableSize: number;
  prunTable: Record<string, number>;
  cost: number;
  MAX_PRUN_SIZE: number;
  solvedStates: string[];
  doMove: Function;
  movesList: any[];
  toUpdateArr: string[] | null;
  state: string;

  sol: any;
  solArr: string[] | null;
  prevSolStr: string | null;
  subOpt: any;
  visited: any;
  maxl: any;

  constructor(solvedStates: string[], doMove: Function, moves: Record<string, number>) {
    this.solvedStates = solvedStates;
    this.doMove = doMove;
    this.movesList = [];
    for (const move in moves) {
      this.movesList.push([move, moves[move]]);
    }
    this.prunTable = {};
    this.toUpdateArr = null;
    this.prunTableSize = 0;
    this.prunDepth = -1;
    this.state = "";
    this.prevSize = 0;
    this.cost = 0;
    this.MAX_PRUN_SIZE = 100000;
    this.solArr = null;
    this.prevSolStr = "";
  }

  updatePrun(targetDepth?: number) {
    targetDepth = targetDepth === undefined ? this.prunDepth + 1 : targetDepth;

    for (let depth = this.prunDepth + 1; depth <= targetDepth; depth++) {
      if (this.prevSize >= this.MAX_PRUN_SIZE) {
        break;
      }
      const t = +new Date();
      if (depth < 1) {
        this.prevSize = 0;
        for (let i = 0; i < this.solvedStates.length; i++) {
          const state = this.solvedStates[i];
          if (!(state in this.prunTable)) {
            this.prunTable[state] = depth;
            this.prunTableSize++;
          }
        }
      } else {
        this.updatePrunBFS(depth - 1);
      }
      if (this.cost == 0) {
        return;
      }
      this.prunDepth = depth;
      this.prevSize = this.prunTableSize;
    }
  }

  updatePrunBFS(fromDepth: number) {
    if (this.toUpdateArr == null) {
      this.toUpdateArr = [];
      for (const state in this.prunTable) {
        if (this.prunTable[state] != fromDepth) {
          continue;
        }
        this.toUpdateArr.push(state);
      }
    }
    while (this.toUpdateArr.length != 0) {
      const state = this.toUpdateArr.pop();
      for (let moveIdx = 0; moveIdx < this.movesList.length; moveIdx++) {
        const newState = this.doMove(state, this.movesList[moveIdx][0]);
        if (!newState || newState in this.prunTable) {
          continue;
        }
        this.prunTable[newState] = fromDepth + 1;
        this.prunTableSize++;
      }
      if (this.cost >= 0) {
        if (this.cost == 0) {
          return;
        }
        this.cost--;
      }
    }
    this.toUpdateArr = null;
  }

  search(state: string, minl: number, MAXL = 98) {
    this.sol = [];
    this.subOpt = false;
    this.state = state;
    this.visited = {};
    this.maxl = minl = minl || 0;
    return this.searchNext(MAXL);
  }

  searchNext(MAXL = 98, cost = -1) {
    MAXL = MAXL + 1;
    this.cost = cost;

    this.prevSolStr = this.solArr ? this.solArr.join(",") : null;
    this.solArr = null;

    for (; this.maxl < MAXL; this.maxl += 1) {
      this.updatePrun(Math.ceil(this.maxl / 2));
      if (this.cost == 0) {
        return null;
      }
      if (this.idaSearch(this.state, this.maxl, null, 0)) {
        break;
      }
    }

    return this.solArr as string[] | null;
  }

  getPruning(state: string) {
    const prun = this.prunTable[state];
    return prun === undefined ? this.prunDepth + 1 : prun;
  }

  idaSearch(state: string, maxl: number, lm: any, depth: number) {
    if (this.getPruning(state) > maxl) {
      return false;
    }
    if (maxl == 0) {
      if (this.solvedStates.indexOf(state) == -1) {
        return false;
      }
      const solArr = this.getSolArr();
      this.subOpt = true;
      if (solArr.join(",") == this.prevSolStr) {
        return false;
      }
      this.solArr = solArr;
      return true;
    }
    if (!this.subOpt) {
      if (state in this.visited && this.visited[state] < depth) {
        return false;
      }
      this.visited[state] = depth;
    }
    if (this.cost >= 0) {
      if (this.cost == 0) {
        return true;
      }
      this.cost--;
    }
    const lastMove = lm == null ? "" : this.movesList[lm][0];
    const lastAxisFace = lm == null ? -1 : this.movesList[lm][1];
    for (let moveIdx = this.sol[depth] || 0; moveIdx < this.movesList.length; moveIdx++) {
      const moveArgs = this.movesList[moveIdx];
      const axisface = moveArgs[1] ^ lastAxisFace;
      const move = moveArgs[0];
      if (axisface == 0 || ((axisface & 0xf) == 0 && move <= lastMove)) {
        continue;
      }
      const newState = this.doMove(state, move);
      if (!newState || newState == state) {
        continue;
      }
      this.sol[depth] = moveIdx;
      if (this.idaSearch(newState, maxl - 1, moveIdx, depth + 1)) {
        return true;
      }
      this.sol.pop();
    }
    return false;
  }

  getSolArr() {
    const solArr = [];
    for (let i = 0; i < this.sol.length; i++) {
      solArr.push(this.movesList[this.sol[i]][0]);
    }
    return solArr;
  }
}

const randGen = (function () {
  const isaac = new Isaac();
  let rndCnt: number;
  let seedStr: string; // '' + new Date().getTime();

  function random() {
    rndCnt++;
    return isaac.random();
  }

  function getSeed(): any[] {
    return [rndCnt, seedStr];
  }

  function setSeed(_rndCnt: number, _seedStr: string) {
    if (_seedStr && (_seedStr != seedStr || rndCnt > _rndCnt)) {
      const seed = [];
      for (let i = 0; i < _seedStr.length; i++) {
        seed[i] = _seedStr.charCodeAt(i);
      }
      isaac.seed(seed);
      rndCnt = 0;
      seedStr = _seedStr;
    }
    while (rndCnt < _rndCnt) {
      isaac.random();
      rndCnt++;
    }
  }

  // setSeed(0, '1576938267035');
  setSeed(0, "" + new Date().getTime());

  return {
    random: random,
    getSeed: getSeed,
    setSeed: setSeed,
  };
})();

export function rndEl(x: any[]) {
  return x[~~(randGen.random() * x.length)];
}

export function rn(n: number) {
  return ~~(randGen.random() * n);
}

export function rndPerm(n: number, isEven?: boolean) {
  let p = 0;
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr[i] = i;
  }
  for (let i = 0; i < n - 1; i++) {
    const k = rn(n - i);
    circle(arr, i, i + k);
    p ^= Number(k != 0);
  }
  if (isEven && p) {
    circle(arr, 0, 1);
  }
  return arr;
}

export function rndProb(plist: number[]) {
  let cum = 0;
  let curIdx = 0;
  for (let i = 0; i < plist.length; i++) {
    if (plist[i] == 0) {
      continue;
    }
    if (randGen.random() < plist[i] / (cum + plist[i])) {
      curIdx = i;
    }
    cum += plist[i];
  }
  return curIdx;
}

export function time2str(unix: number, format: string) {
  if (!unix) {
    return "N/A";
  }
  format = format || "%Y-%M-%D %h:%m:%s";
  const date = new Date(unix * 1000);
  return format
    .replace("%Y", date.getFullYear().toString())
    .replace("%M", ("0" + (date.getMonth() + 1)).slice(-2))
    .replace("%D", ("0" + date.getDate()).slice(-2))
    .replace("%h", ("0" + date.getHours()).slice(-2))
    .replace("%m", ("0" + date.getMinutes()).slice(-2))
    .replace("%s", ("0" + date.getSeconds()).slice(-2));
}

const timeRe = /^\s*(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)\s*$/;

export function str2time(val: string) {
  const m = timeRe.exec(val);
  if (!m) {
    return null;
  }
  const date = new Date(0);
  date.setFullYear(~~m[1]);
  date.setMonth(~~m[2] - 1);
  date.setDate(~~m[3]);
  date.setHours(~~m[4]);
  date.setMinutes(~~m[5]);
  date.setSeconds(~~m[6]);
  return ~~(date.getTime() / 1000);
}

export function obj2str(val: object) {
  if (typeof val == "string") {
    return val;
  }
  return JSON.stringify(val);
}

export function str2obj(val: any): object {
  if (typeof val != "string") {
    return val;
  }
  return JSON.parse(val);
}

export function valuedArray(len: number, val: any) {
  const ret = [];
  for (let i = 0; i < len; i++) {
    ret[i] = val;
  }
  return ret;
}

export function idxArray(arr: readonly any[], idx: number) {
  const ret = [];
  for (let i = 0; i < arr.length; i++) {
    ret.push(arr[i][idx]);
  }
  return ret;
}

export const minx = (function () {
  const U = 0,
    R = 1,
    F = 2,
    L = 3,
    BL = 4,
    BR = 5,
    DR = 6,
    DL = 7,
    DBL = 8,
    B = 9,
    DBR = 10,
    D = 11;
  const oppFace = [D, DBL, B, DBR, DR, DL, BL, BR, R, F, L, U];
  const adjFaces = [
    [BR, R, F, L, BL], //U
    [DBR, DR, F, U, BR], //R
    [DR, DL, L, U, R], //F
    [DL, DBL, BL, U, F], //L
    [DBL, B, BR, U, L], //BL
    [B, DBR, R, U, BL], //BR
    [D, DL, F, R, DBR], //DR
    [D, DBL, L, F, DR], //DL
    [D, B, BL, L, DL], //DBL
    [D, DBR, BR, BL, DBL], //B
    [D, DR, R, BR, B], //DBR
    [DR, DBR, B, DBL, DL], //D
  ];

  // wide: 0=single, 1=all, 2=all but single
  // state: corn*5, edge*5, center*1
  function doMove(state: number[], face: number, pow: number, wide: number) {
    pow = ((pow % 5) + 5) % 5;
    if (pow == 0) {
      return;
    }
    const base = face * 11;
    const adjs = [];
    const swaps: number[][] = [[], [], [], [], []];
    for (let i = 0; i < 5; i++) {
      const aface = adjFaces[face][i];
      const ridx = adjFaces[aface].indexOf(face);
      if (wide == 0 || wide == 1) {
        swaps[i].push(base + i);
        swaps[i].push(base + i + 5);
        swaps[i].push(aface * 11 + (ridx % 5) + 5);
        swaps[i].push(aface * 11 + (ridx % 5));
        swaps[i].push(aface * 11 + ((ridx + 1) % 5));
      }
      if (wide == 1 || wide == 2) {
        swaps[i].push(aface * 11 + 10);
        for (let j = 1; j < 5; j++) {
          swaps[i].push(aface * 11 + ((ridx + j) % 5) + 5);
        }
        for (let j = 2; j < 5; j++) {
          swaps[i].push(aface * 11 + ((ridx + j) % 5));
        }
        const ii = 4 - i;
        const opp = oppFace[face];
        const oaface = adjFaces[opp][ii];
        const oridx = adjFaces[oaface].indexOf(opp);
        swaps[i].push(opp * 11 + ii);
        swaps[i].push(opp * 11 + ii + 5);
        swaps[i].push(oaface * 11 + 10);
        for (let j = 0; j < 5; j++) {
          swaps[i].push(oaface * 11 + ((oridx + j) % 5) + 5);
          swaps[i].push(oaface * 11 + ((oridx + j) % 5));
        }
      }
    }
    for (let i = 0; i < swaps[0].length; i++) {
      acycle(state, [swaps[0][i], swaps[1][i], swaps[2][i], swaps[3][i], swaps[4][i]], pow);
    }
  }

  return {
    doMove: doMove,
    oppFace: oppFace,
    adjFaces: adjFaces,
  };
})();

export const SOLVED_FACELET = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
export const getSeed = randGen.getSeed;
export const setSeed = randGen.setSeed;
