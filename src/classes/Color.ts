function types(arr: any[]) {
  let res = [];

  for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
    if ( Array.isArray(arr[i]) ) {
      res.push('a');
    } else switch( typeof arr[i] ) {
      case 'number':
      case 'string':
      case 'object':
      case 'undefined':
      case 'function': {
        res.push( ( typeof arr[i] )[0] );
        break;
      }
      default: {
        res.push('?');
        break;
      }
    }
  }

  return res.join('');
}

function adjust(val: number, a ?: number, b ?: number) {
  let ini = a || 0;
  let fin = b || 255;
  if ( ini > fin ) {
    ini += fin;
    fin = ini - fin;
    ini = ini - fin;
  }
  return Math.min( Math.max(ini, val), fin);
}

export class Color {
  color: number[];
  constructor(a?: any, b?: any, c?: any, d?: any, e?: any) {
    let tp = types([ a, b, c, d, e ]);

    this.color = [0, 1, 2].map(_ => Math.round(Math.random() * 255) );
    this.color[0]= adjust( this.color[0] );
    this.color[1]= adjust( this.color[1] );
    this.color[2]= adjust( this.color[2] );
    this.color[3]= 1;

    switch( tp ) {
      case 'nnnns': {
        if ( e.match(/cmyk/i) ) {
          this.fromCMYK(a, b, c, d);
        } else if ( e.match(/rgba/i) ) {
          this.fromRGBA(a, b, c, d);
        } else {
          throw new TypeError(`Unknown format color ${e}`);
        }
        break;
      }
      case 'nnnnu': {
        this.fromRGBA(a, b, c, d);
        break;
      }
      case 'nnnsu': {
        if ( d.match(/cmy/i) ) {
          this.fromCMY(a, b, c);
        } else if ( d.match(/ryb/i) ) {
          this.fromRYB(a, b, c);
        } else if ( d.match(/hsv/i) ) {
          this.fromHSV(a, b, c);
        } else {
          throw new TypeError(`Unknown format color ${e}`);
        }
        break;
      }
      case 'nnnuu': {
        this.fromRGB(a, b, c);
        break;
      }
      case 'suuuu': {
        this.fromString(a);
        break;
      }
      case 'uuuuu': {
        /// Allow for random generation
        break;
      }
      default: {
        // throw new TypeError(`Invalid parameters`);
      }
    }

  }

  set(k: number, v: number) {
    this.color[k] = v;
  }

  fromCMY(C: number, M: number, Y: number) {
    throw new ReferenceError('CMY not supported yet');
  }

  fromCMYK(C: number, M: number, Y: number, K: number) {
    throw new ReferenceError('CMYK not supported yet');
  }

  fromRYB(R: number, Y: number, B: number) {
    throw new ReferenceError('RYB not supported yet');
  }

  fromHSV(HL: number, S: number, V: number) {
    throw new ReferenceError('HSV not supported yet');
  }

  fromRGB(r: number, g: number, b: number) {
    this.color[0] = adjust(r);
    this.color[1] = adjust(g);
    this.color[2] = adjust(b);
  }

  fromRGBA(r: number, g: number, b: number, a: number) {
    this.fromRGB(r, g, b);
    this.color[3] = adjust(a, 0, 1);
  }

  fromString(s: string) {
    let rgbaReg = /$rgba\(([0-9]*),([0-9]*),([0-9]*),([0-9]*)\)$/;
    let rgbReg = /^rgb\(([0-9]*),([0-9]*),([0-9]*)\)$/;
    let hexReg = /^\#(\w{2})(\w{2})(\w{2})$/;
    let hexaReg = /^\#(\w{2})(\w{2})(\w{2})(\w{2})$/;
    let str = s.replace(/\s/g, '');

    if ( rgbaReg.test(str) ) {
      let [r, g, b, a] = str.replace(rgbaReg, '$1 $2 $3 $4').split(' ').map(Number);
      this.fromRGBA(r, g, b, a);
    } else if ( rgbReg.test(str) ) {
      let [r, g, b] = str.replace(rgbReg, '$1 $2 $3').split(' ').map(Number);
      this.fromRGB(r, g, b);
    } else if ( hexaReg.test(str) ) {
      let [r, g, b, a] = str.replace(hexaReg, '$1 $2 $3 $4').split(' ').map(e => parseInt(e, 16));
      this.fromRGBA(r, g, b, a);
    } else if ( hexReg.test(str) ) {
      let [r, g, b] = str.replace(hexReg, '$1 $2 $3').split(' ').map(e => parseInt(e, 16));
      this.fromRGB(r, g, b);
    } else {
      throw new TypeError('String format other than rgb() or rgba() not supported yet');
    }
  }

  interpolate(col: Color, a: number): Color {
    let c = new Color();
    c.color = this.color.map((e, p) => e * (1 - a) + col.color[p] * a);
    return c;
  }

  clone() {
    let res = new Color(0, 0, 0);
    res.color = this.color.map(e => e);
    return res;
  }

  toHex(alpha: boolean = true): string {
    let t = this.color.map(e => e);
    t[3] = adjust(t[3] * 255);
    !alpha && t.pop();
    return '#' + t.map(e => ('00' + e.toString(16)).substr(-2, 2)).join('');
  }

  toNumber(): number {
    let res = 0;
    for (let i = 0; i < 3; i += 1) {
      res *= 256;
      res += this.color[i];
    }
    return res;
  }

  toRGBStr(): string {
    return `rgb(${this.color[0]}, ${this.color[1]}, ${this.color[2]})`;
  }

  toRGBAStr(): string {
    return `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${~~(this.color[3] * 255) })`;
  }

  toArray(): number[] {
    return this.color.map(e => e);
  }

  static GREEN = new Color(63, 197, 69); // "rgb(63, 197, 69)";
  static RED = new Color(229, 57, 53); // "rgb(229,57,53)";
  static BLUE = new Color(25, 118, 210); // "rgb(25,118,210)";
  static ORANGE = new Color(225, 167, 38); // "rgb(255,167,38)";
  static YELLOW = new Color(255, 235, 59); // "rgb(255,235,59)";
  static WHITE = new Color(230, 230, 230); // "rgb(230, 230, 230)";
  static BLACK = new Color(0, 0, 0); // "rgb(0, 0, 0)";
  static GRAY = new Color(80, 80, 80); // "rgb(80, 80, 80)";
}