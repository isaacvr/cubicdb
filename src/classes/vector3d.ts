import { EPS } from '@constants';
import { Quaternion } from './quaternion';

const PI = Math.PI;
const TAU = PI * 2;
const R1_2 = Math.SQRT1_2;

function fixedSin(ang: number): number {
  let rAng = ((ang % TAU) + TAU) % TAU;
  let sinTable = [
    [PI / 6, 0.5],
    [PI * 5 / 6, 0.5],
    [PI * 7 / 6, -0.5],
    [PI * 11 / 6, -0.5],
    [PI / 4, R1_2],
    [PI, 0],
    [TAU - PI / 4, -R1_2],
  ];

  for (let i = 0, maxi = sinTable.length; i < maxi; i += 1) {
    if ( Math.abs(sinTable[i][0] - rAng) < EPS ) {
      return sinTable[i][1];
    }
  }

  return Math.sin(ang);
}

function fixedCos(ang: number): number {
  let rAng = ((ang % TAU) + TAU) % TAU;
  let cosTable = [
    [PI / 2, 0],
    [PI * 3 / 4, R1_2],
    [PI * 5 / 4, -R1_2],
    [PI * 2 / 3, -0.5],
    [PI / 3, 0.5],
    [PI * 4 / 3, -0.5],
    [PI * 5 / 3, 0.5],
  ];

  for (let i = 0, maxi = cosTable.length; i < maxi; i += 1) {
    if ( Math.abs(cosTable[i][0] - rAng) < EPS ) {
      return cosTable[i][1];
    }
  }

  return Math.cos(ang);
}

function getCanonical(v: Vector3D) {
  let dirs = [ UP, RIGHT, FRONT, DOWN, LEFT, BACK ];

  for (let i = 0, maxi = dirs.length; i < maxi; i += 1) {
    if ( dirs[i].sub(v).abs() < EPS ) {
      return dirs[i].clone();
    }
  }

  let cmps = [ v.x, v.y, v.z ];

  cmps = cmps
    .map(n => Math.abs(n - Math.round(n)) < EPS ? Math.round(n) : n)
    .map(n => {
      for (let i = 2; i <= 100; i += 1) {
        if ( Math.abs(n * i - Math.round(n * i)) < EPS * i ) {
          return Math.round(n * i) / i;
        }
      }
      return n;
    });

  return new Vector3D(cmps[0], cmps[1], cmps[2]);
}

export class Vector3D {
  x: number;
  y: number;
  z: number;
  private isConstant: boolean;

  constructor(x ?: number, y ?: number, z ?: number, isConstant = false) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.isConstant = isConstant;
  }

  static cross(a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    let v1 = b.sub(a);
    let v2 = c.sub(b);
    return v1.cross(v2);
  }

  static crossValue(a: Vector3D, b: Vector3D, c: Vector3D): number {
    return a.x * ( b.y * c.z - c.y * b.z ) - 
           a.y * ( b.x * c.z - c.x * b.z ) +
           a.z * ( b.x * c.y - c.x * b.y );
  }

  static direction(p1: Vector3D, p2: Vector3D, p3: Vector3D, vec: Vector3D): -1 | 0 | 1 {
    return Vector3D.direction1(p1, Vector3D.cross(p1, p2, p3), vec);
  }

  static direction1(anchor: Vector3D, u: Vector3D, pt: Vector3D): -1 | 0 | 1 {
    let dot = u.dot( pt.sub(anchor) );
    if ( Math.abs(dot) < EPS ) {
      return 0;
    }
    return <-1 | 0 | 1> Math.sign(dot);
  }

  static project(pt: Vector3D, a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    return Vector3D.project1(pt, a, Vector3D.cross(a, b, c).unit());
  }

  static project1(pt: Vector3D, a: Vector3D, u: Vector3D): Vector3D {
    let v = pt.sub(a);
    let dist = u.dot(v);
    return pt.add( u.mul(-dist) );
  }

  project(a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    return this.project1(a, Vector3D.cross(a, b, c).unit());
  }

  project1(a: Vector3D, u: Vector3D): Vector3D {
    return Vector3D.project1(this, a, u);
  }

  reflect(a: Vector3D, b: Vector3D, c: Vector3D, self?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }
    return this.reflect1(a, Vector3D.cross(a, b, c).unit(), self);
  }

  reflect1(a: Vector3D, u: Vector3D, self?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    return this.add( u.mul( -2 * this.sub(a).dot(u) ), self );
  }

  cross(v: Vector3D): Vector3D {
    return getCanonical(new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    ));
  }

  dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  add(v: Vector3D, self ?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    if ( self ) {
      this.x += v.x; this.y += v.y; this.z += v.z;
      return this;
    }
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3D, self ?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    if ( self ) {
      this.x -= v.x; this.y -= v.y; this.z -= v.z;
      return this;
    }
    return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(f: number, self ?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    if ( self ) {
      this.x *= f; this.y *= f; this.z *= f;
      return this;
    }
    return new Vector3D(this.x * f, this.y * f, this.z * f);
  }

  div(f: number, self ?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    if ( self ) {
      this.x /= f; this.y /= f; this.z /= f;
      return this;
    }
    return new Vector3D(this.x / f, this.y / f, this.z / f);
  }

  rotate(O: Vector3D, u: Vector3D, ang: number, self ?: boolean): Vector3D {
    if ( self && this.isConstant ) {
      throw new TypeError('Constant vector does not allow modification');
    }

    // let nu = new Vector3(u.x, u.y, u.z).setLength(1);

    // let v3 = new Vector3(this.x - O.x, this.y - O.y, this.z - O.z);
    // v3.applyAxisAngle(nu, ang).add( new Vector3(O.x, O.y, O.z) );

    // if ( self ) {
    //   this.x = v3.x;
    //   this.y = v3.y;
    //   this.z = v3.z;
    //   return this;
    // }

    // return new Vector3D(v3.x, v3.y, v3.z);

    const vecs = [0, 1, 2].map(n => [[RIGHT, UP, FRONT][n], n]);
    const fAngs = [0, 1, 2, 3].map(n => [n * PI / 2, n]);
    const rAng = ((ang % TAU) + TAU) % TAU;

    if ( O.abs() < EPS && vecs.some(v => (v[0] as Vector3D).cross(u).abs() < EPS) && fAngs.some(a => Math.abs(a[0] - rAng) < EPS) ) {
      let idx = [
        (vt: Vector3D) => new Vector3D(vt.x, -vt.z, vt.y), // RIGHT => (x, y, z) => (x, -z, y)
        (vt: Vector3D) => new Vector3D(vt.z, vt.y, -vt.x), // UP    => (x, y, z) => (z, y, -x)
        (vt: Vector3D) => new Vector3D(-vt.y, vt.x, vt.z), // FRONT => (x, y, z) => (-y, x, z)
      ];

      let aIndex = fAngs.filter(a => Math.abs(a[0] - rAng) < EPS)[0][1];
      let vIndex = vecs.filter(v => (v[0] as Vector3D).cross(u).abs() < EPS)[0][1] as number;
      let cant = (vecs[vIndex][0] as Vector3D).dot(u) > 0 ? aIndex : (4 - aIndex) % 4;
      let vt = this.clone();

      for (let i = 1; i <= cant; i += 1) {
        vt = idx[vIndex](vt);
      }

      if ( self ) {
        this.x = vt.x;
        this.y = vt.y;
        this.z = vt.z;
        return this;
      }

      return vt;
    }

    const CA = fixedCos(ang / 2);
    const SA = fixedSin(ang / 2);

    let U = u.unit();

    let p = new Quaternion(0, (this.x - O.x), (this.y - O.y), (this.z - O.z));
    let h = new Quaternion(
      CA,
      SA * U.x,
      SA * U.y,
      SA * U.z,
    )

    let qp = h.multiply( p ).multiply( h.conjugate() );

    if ( self ) {
      this.x = qp.x + O.x;
      this.y = qp.y + O.y;
      this.z = qp.z + O.z;
      return this;
    }

    return new Vector3D(
      qp.x + O.x,
      qp.y + O.y,
      qp.z + O.z,
    );
  }

  clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  abs(): number {
    return this.abs2() ** .5;
  }

  abs2(): number {
    return (this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  unit(): Vector3D {
    let len = this.abs();
    if ( len != 0 ) {
      return getCanonical( this.div(len) );
    }
    return new Vector3D(0, 0, 0);
  }

  proj(a: Vector3D): Vector3D {
    return a.setLength( this.dot(a) / a.abs() );
  }

  setLength(n: number): Vector3D {
    return this.unit().mul(n);
  }

  toString(): string {
    return `<${this.x}; ${this.y}; ${this.z}>`;
  }

  toNormal(): Vector3D {
    let coords = [ this.x, this.y, this.z ].map(e => Math.abs(e) < EPS ? 0 : Math.sign(e) );
    this.x = coords[0];
    this.y = coords[1];
    this.z = coords[2];
    return this;
  }

}

export const CENTER = new Vector3D(0, 0, 0, true);

export const RIGHT = new Vector3D(1, 0, 0, true);
export const LEFT = new Vector3D(-1, 0, 0, true);

export const FRONT = new Vector3D(0, 0, 1, true);
export const BACK = new Vector3D(0, 0, -1, true);

export const UP = new Vector3D(0, 1, 0, true);
export const DOWN = new Vector3D(0, -1, 0, true);