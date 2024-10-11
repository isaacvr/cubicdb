import { EPS } from "@constants";
import { Vector3 } from "three";

const PI = Math.PI;
const TAU = PI * 2;

function getCanonical(v: Vector3D) {
  let dirs = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  for (let i = 0, maxi = dirs.length; i < maxi; i += 1) {
    if (dirs[i].sub(v).abs() < EPS) {
      return dirs[i].clone();
    }
  }

  let cmps = [v.x, v.y, v.z];

  cmps = cmps.map(n => (Math.abs(n - Math.round(n)) < EPS ? Math.round(n) : n));

  return new Vector3D(cmps[0], cmps[1], cmps[2]);
}

export class Vector3D {
  x: number;
  y: number;
  z: number;
  private isConstant: boolean;

  constructor(x?: number, y?: number, z?: number, isConstant = false) {
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
    return (
      a.x * (b.y * c.z - c.y * b.z) - a.y * (b.x * c.z - c.x * b.z) + a.z * (b.x * c.y - c.x * b.y)
    );
  }

  static direction(p1: Vector3D, p2: Vector3D, p3: Vector3D, vec: Vector3D): -1 | 0 | 1 {
    return Vector3D.direction1(p1, Vector3D.cross(p1, p2, p3), vec);
  }

  static direction1(anchor: Vector3D, u: Vector3D, pt: Vector3D): -1 | 0 | 1 {
    let dot = u.dot(pt.sub(anchor));
    if (Math.abs(dot) < EPS) {
      return 0;
    }
    return <-1 | 0 | 1>Math.sign(dot);
  }

  static project(pt: Vector3D, a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    return Vector3D.project1(pt, a, Vector3D.cross(a, b, c).unit());
  }

  static project1(pt: Vector3D, a: Vector3D, u: Vector3D): Vector3D {
    let v = pt.sub(a);
    let dist = u.dot(v);
    return pt.add(u.mul(-dist));
  }

  setConstant(cnt: boolean) {
    this.isConstant = cnt;
  }

  project(a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    return this.project1(a, Vector3D.cross(a, b, c).unit());
  }

  project1(a: Vector3D, u: Vector3D): Vector3D {
    return Vector3D.project1(this, a, u);
  }

  reflect(a: Vector3D, b: Vector3D, c: Vector3D, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }
    return this.reflect1(a, Vector3D.cross(a, b, c).unit(), self);
  }

  reflect1(a: Vector3D, u: Vector3D, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    return this.add(u.mul(-2 * this.sub(a).dot(u)), self);
  }

  cross(v: Vector3D): Vector3D {
    return getCanonical(
      new Vector3D(
        this.y * v.z - this.z * v.y,
        this.z * v.x - this.x * v.z,
        this.x * v.y - this.y * v.x
      )
    );
  }

  dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  add(v: Vector3D, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    if (self) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3D, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    if (self) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(f: number, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    if (self) {
      this.x *= f;
      this.y *= f;
      this.z *= f;
      return this;
    }
    return new Vector3D(this.x * f, this.y * f, this.z * f);
  }

  div(f: number, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    if (self) {
      this.x /= f;
      this.y /= f;
      this.z /= f;
      return this;
    }
    return new Vector3D(this.x / f, this.y / f, this.z / f);
  }

  rotate(O: Vector3D, u: Vector3D, ang: number, self?: boolean): Vector3D {
    if (self && this.isConstant) {
      console.log("Trying to modify a constant vector");
      return this;
    }

    const vecs = [0, 1, 2].map(n => [[RIGHT, UP, FRONT][n], n]);
    const fAngs = [0, 1, 2, 3].map(n => [(n * PI) / 2, n]);
    const rAng = ((ang % TAU) + TAU) % TAU;

    if (
      O.abs() < EPS &&
      vecs.some(v => (v[0] as Vector3D).cross(u).abs() < EPS) &&
      fAngs.some(a => Math.abs(a[0] - rAng) < EPS)
    ) {
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

      if (self) {
        this.x = vt.x;
        this.y = vt.y;
        this.z = vt.z;
        return this;
      }

      return vt;
    }

    // let nu = new Vector3(u.x, u.y, u.z).setLength(1);

    // let v3 = new Vector3(this.x - O.x, this.y - O.y, this.z - O.z);
    // v3.applyAxisAngle(nu, ang).add(new Vector3(O.x, O.y, O.z));
    let k = u.unit();
    let v = this.sub(O);
    let p1 = v.mul(Math.cos(ang));
    let p2 = k.cross(v).mul(Math.sin(ang));
    let p3 = k.mul(k.dot(v) * (1 - Math.cos(ang)));
    let v3 = p1.add(p2, true).add(p3, true).add(O, true);

    if (self) {
      this.x = v3.x;
      this.y = v3.y;
      this.z = v3.z;
      return this;
    }

    return new Vector3D(v3.x, v3.y, v3.z);
  }

  clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  abs(): number {
    return this.abs2() ** 0.5;
  }

  abs2(): number {
    return this.x ** 2 + this.y ** 2 + this.z ** 2;
  }

  unit(): Vector3D {
    let len = this.abs();
    if (len != 0) {
      return getCanonical(this.div(len));
    }
    return new Vector3D(0, 0, 0);
  }

  proj(a: Vector3D): Vector3D {
    return a.setLength(this.dot(a) / a.abs());
  }

  setLength(n: number): Vector3D {
    return this.unit().mul(n);
  }

  toString(): string {
    return `<${this.x}; ${this.y}; ${this.z}>`;
  }

  toNormal(): Vector3D {
    let coords = [this.x, this.y, this.z].map(e => (Math.abs(e) < EPS ? 0 : Math.sign(e)));
    this.x = coords[0];
    this.y = coords[1];
    this.z = coords[2];
    return this;
  }

  setCoords(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export const CENTER = new Vector3D(0, 0, 0, true);

export const RIGHT = new Vector3D(1, 0, 0, true);
export const LEFT = new Vector3D(-1, 0, 0, true);

export const FRONT = new Vector3D(0, 0, 1, true);
export const BACK = new Vector3D(0, 0, -1, true);

export const UP = new Vector3D(0, 1, 0, true);
export const DOWN = new Vector3D(0, -1, 0, true);
