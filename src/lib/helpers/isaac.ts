/* ----------------------------------------------------------------------
 * Copyright (c) 2012 Yves-Marie K. Rinquin
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ----------------------------------------------------------------------
 *
 * ISAAC is a cryptographically secure pseudo-random number generator
 * (or CSPRNG for short) designed by Robert J. Jenkins Jr. in 1996 and
 * based on RC4. It is designed for speed and security.
 *
 * ISAAC's informations & analysis:
 *   http://burtleburtle.net/bob/rand/isaac.html
 * ISAAC's implementation details:
 *   http://burtleburtle.net/bob/rand/isaacafa.html
 *
 * ISAAC succesfully passed TestU01
 *
 * ----------------------------------------------------------------------
 *
 * Usage:
 *   <script src="isaac.js"></script>
 *   var random_number = isaac.random();
 *
 * Output: [ 0x00000000; 0xffffffff]
 *         [-2147483648; 2147483647]
 *
 */

function add(x: number, y: number) {
  const lsb = (x & 0xffff) + (y & 0xffff);
  const msb = (x >>> 16) + (y >>> 16) + (lsb >>> 16);
  return (msb << 16) | (lsb & 0xffff);
}

export class Isaac {
  m: number[];
  acc: number;
  brs: number;
  cnt: number;
  r: number[];
  gnt: number;

  constructor() {
    this.m = Array(256); // internal memory
    this.acc = 0; // accumulator
    this.brs = 0; // last result
    this.cnt = 0; // counter
    this.r = Array(256); // result array
    this.gnt = 0; // generation counter

    this.seed(Math.random() * 0xffffffff);
  }

  reset() {
    this.acc = this.brs = this.cnt = 0;
    for (let i = 0; i < 256; i += 1) this.m[i] = this.r[i] = 0;
    this.gnt = 0;
  }

  seed(s: number | number[]) {
    let a: number;
    let b: number;
    let c: number;
    let d: number;
    let e: number;
    let f: number;
    let g: number;
    let h: number;
    let i: number;

    /* seeding the seeds of love */
    a = b = c = d = e = f = g = h = 0x9e3779b9; /* the golden ratio */

    if (s && typeof s === "number") {
      s = [s];
    }

    if (s instanceof Array) {
      this.reset();
      for (let i = 0, maxi = s.length; i < maxi; i += 1) {
        this.r[i & 0xff] += typeof s[i] === "number" ? s[i] : 0;
      }
    }

    /* private: seed mixer */
    function seed_mix() {
      a ^= b << 11;
      d = add(d, a);
      b = add(b, c);
      b ^= c >>> 2;
      e = add(e, b);
      c = add(c, d);
      c ^= d << 8;
      f = add(f, c);
      d = add(d, e);
      d ^= e >>> 16;
      g = add(g, d);
      e = add(e, f);
      e ^= f << 10;
      h = add(h, e);
      f = add(f, g);
      f ^= g >>> 4;
      a = add(a, f);
      g = add(g, h);
      g ^= h << 8;
      b = add(b, g);
      h = add(h, a);
      h ^= a >>> 9;
      c = add(c, h);
      a = add(a, b);
    }

    for (i = 0; i < 4; i += 1 /* scramble it */) seed_mix();

    for (i = 0; i < 256; i += 8) {
      if (s) {
        /* use all the information in the seed */
        a = add(a, this.r[i + 0]);
        b = add(b, this.r[i + 1]);
        c = add(c, this.r[i + 2]);
        d = add(d, this.r[i + 3]);
        e = add(e, this.r[i + 4]);
        f = add(f, this.r[i + 5]);
        g = add(g, this.r[i + 6]);
        h = add(h, this.r[i + 7]);
      }
      seed_mix();
      /* fill in m[] with messy stuff */
      this.m[i + 0] = a;
      this.m[i + 1] = b;
      this.m[i + 2] = c;
      this.m[i + 3] = d;
      this.m[i + 4] = e;
      this.m[i + 5] = f;
      this.m[i + 6] = g;
      this.m[i + 7] = h;
    }

    if (s) {
      /* do a second pass to make all of the seed affect all of m[] */
      for (i = 0; i < 256; i += 8) {
        a = add(a, this.m[i + 0]);
        b = add(b, this.m[i + 1]);
        c = add(c, this.m[i + 2]);
        d = add(d, this.m[i + 3]);
        e = add(e, this.m[i + 4]);
        f = add(f, this.m[i + 5]);
        g = add(g, this.m[i + 6]);
        h = add(h, this.m[i + 7]);
        seed_mix();
        /* fill in m[] with messy stuff (again) */
        this.m[i + 0] = a;
        this.m[i + 1] = b;
        this.m[i + 2] = c;
        this.m[i + 3] = d;
        this.m[i + 4] = e;
        this.m[i + 5] = f;
        this.m[i + 6] = g;
        this.m[i + 7] = h;
      }
    }

    this.prng(); /* fill in the first set of results */
    this.gnt = 256; /* prepare to use the first set of results */
  }

  prng(n?: number) {
    let i, x, y;

    n = n && typeof n === "number" ? Math.abs(Math.floor(n)) : 1;

    while (n--) {
      this.cnt = add(this.cnt, 1);
      this.brs = add(this.brs, this.cnt);

      for (i = 0; i < 256; i += 1) {
        switch (i & 3) {
          case 0:
            this.acc ^= this.acc << 13;
            break;
          case 1:
            this.acc ^= this.acc >>> 6;
            break;
          case 2:
            this.acc ^= this.acc << 2;
            break;
          case 3:
            this.acc ^= this.acc >>> 16;
            break;
        }
        this.acc = add(this.m[(i + 128) & 0xff], this.acc);
        x = this.m[i];
        this.m[i] = y = add(this.m[(x >>> 2) & 0xff], add(this.acc, this.brs));
        this.r[i] = this.brs = add(this.m[(y >>> 10) & 0xff], x);
      }
    }
  }

  rand() {
    if (!this.gnt--) {
      this.prng();
      this.gnt = 255;
    }
    return this.r[this.gnt];
  }

  internals() {
    return { a: this.acc, b: this.brs, c: this.cnt, m: this.m, r: this.r };
  }

  random() {
    return ((this.rand() >>> 5) * 0x4000000 + (this.rand() >>> 6)) / 0x20000000000000;
  }
}
