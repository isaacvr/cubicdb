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

export class MersenneTwisterObject {
  N: number;
  mask: number;
  mt = [];
  mti: number;
  m01: number[];
  M: number;
  N1: number;
  NM: number;
  MN: number;
  U: number;
  L: number;
  R: number;

  constructor(seed?, seedArray?) {
    this.N = 624;
    this.mask = 0xffffffff;
    this.mt = [];
    this.mti = NaN;
    this.m01 = [0, 0x9908b0df];
    this.M = 397;
    this.N1 = this.N - 1;
    this.NM = this.N - this.M;
    this.MN = this.M - this.N;
    this.U = 0x80000000;
    this.L = 0x7fffffff;
    this.R = 0x100000000;

    if (arguments.length > 1) this.initByArray(seedArray, seed);
    else if (arguments.length > 0) this.init(seed);
    else this.init();
  }

  dmul0(m, n) {
    let H = 0xffff0000,
      L = 0x0000ffff,
      R = 0x100000000,
      m0 = m & L,
      m1 = (m & H) >>> 16,
      n0 = n & L,
      n1 = (n & H) >>> 16,
      p0,
      p1,
      x;
    (p0 = m0 * n0),
      (p1 = p0 >>> 16),
      (p0 &= L),
      (p1 += m0 * n1),
      (p1 &= L),
      (p1 += m1 * n0),
      (p1 &= L),
      (x = (p1 << 16) | p0);
    return x < 0 ? x + R : x;
  }

  init0(seed) {
    let x = arguments.length > 0 && isFinite(seed) ? seed & this.mask : 4357;
    let i;
    for (
      this.mt = [x], this.mti = this.N, i = 1;
      i < this.N;
      this.mt[i++] = x = (69069 * x) & this.mask
    ) {}
  }

  init(seed?) {
    let x = arguments.length > 0 && isFinite(seed) ? seed & this.mask : 5489;
    let i;
    for (
      this.mt = [x], this.mti = this.N, i = 1;
      i < this.N;
      this.mt[i] = x = this.dmul0(x ^ (x >>> 30), 1812433253) + i++
    ) {}
  }

  initByArray(seedArray, seed) {
    const N1 = this.N - 1;
    const L = seedArray.length;
    let x, i, j, k;
    this.init(arguments.length > 1 && isFinite(seed) ? seed : 19650218);

    (x = this.mt[0]), (i = 1), (j = 0), (k = Math.max(this.N, L));

    for (; k; j %= L, k--) {
      this.mt[i] = x =
        ((this.mt[i++] ^ this.dmul0(x ^ (x >>> 30), 1664525)) + seedArray[j] + j++) & this.mask;
      if (i > N1) {
        this.mt[0] = x = this.mt[N1];
        i = 1;
      }
    }
    for (k = this.N - 1; k; k--) {
      this.mt[i] = x = ((this.mt[i] ^ this.dmul0(x ^ (x >>> 30), 1566083941)) - i++) & this.mask;
      if (i > N1) {
        this.mt[0] = x = this.mt[N1];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
  }

  skip(n) {
    this.mti = n <= 0 ? -1 : this.mti + n;
  }

  randomInt32() {
    let y, k;
    while (this.mti >= this.N || this.mti < 0) {
      this.mti = Math.max(0, this.mti - this.N);
      for (
        k = 0;
        k < this.NM;
        y = (this.mt[k] & this.U) | (this.mt[k + 1] & this.L),
          this.mt[k] = this.mt[k + this.M] ^ (y >>> 1) ^ this.m01[y & 1],
          k++
      ) {}
      for (
        ;
        k < this.N1;
        y = (this.mt[k] & this.U) | (this.mt[k + 1] & this.L),
          this.mt[k] = this.mt[k + this.MN] ^ (y >>> 1) ^ this.m01[y & 1],
          k++
      ) {}
      (y = (this.mt[this.N1] & this.U) | (this.mt[0] & this.L)),
        (this.mt[this.N1] = this.mt[this.M - 1] ^ (y >>> 1) ^ this.m01[y & 1]);
    }
    (y = this.mt[this.mti++]),
      (y ^= y >>> 11),
      (y ^= (y << 7) & 0x9d2c5680),
      (y ^= (y << 15) & 0xefc60000),
      (y ^= y >>> 18);
    return y < 0 ? y + this.R : y;
  }

  randomInt53() {
    const two26 = 0x4000000;
    return (this.randomInt32() >>> 5) * two26 + (this.randomInt32() >>> 6);
  }

  randomReal32() {
    const two32 = 0x100000000;
    return this.randomInt32() / two32;
  }

  randomReal53() {
    const two53 = 0x20000000000000;
    return this.randomInt53() / two53;
  }

  randomString(len) {
    let i,
      r,
      x = "",
      C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (
      i = 0;
      i < len;
      x += C.charAt((i++ % 5 > 0 ? r : (r = this.randomInt32())) & 63), r >>>= 6
    ) {}
    return x;
  }
}
// ====================================================================================================================
// End of file hr$mersennetwister2.js - Copyright (c) 2004,2005 Henk Reints, http://henk-reints.nl

// let mno = new MersenneTwisterObject(new Date().getTime());
// Math.random = () => mno.randomInt53();
