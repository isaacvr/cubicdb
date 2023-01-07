import { Quaternion } from './quaternion';

export class Vector3D {
  x: number;
  y: number;
  z: number;
  constructor(x ?: number, y ?: number, z ?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  static cross(a: Vector3D, b: Vector3D, c: Vector3D): Vector3D {
    let v1 = b.sub(a);
    let v2 = c.sub(b);
    return v1.cross(v2);
  }

  static crossValue(a: Vector3D, b: Vector3D, c: Vector3D): number {
    return a.x * ( b.y * c.z - c.y * b.z ) - 
           a.y * ( b.x * c.z - c.x * b.z ) +
           a.x * ( b.x * c.y - c.x * b.y );
  }

  static direction(a: Vector3D, b: Vector3D, c: Vector3D, d: Vector3D): -1 | 0 | 1 {
    return Vector3D.direction1(a, Vector3D.cross(a, b, c), d);
  }

  static direction1(anchor: Vector3D, u: Vector3D, pt: Vector3D): -1 | 0 | 1 {
    let dot = u.dot( pt.sub(anchor) );
    if ( Math.abs(dot) < 1e-6 ) {
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
    return this.reflect1(a, Vector3D.cross(a, b, c).unit(), self);
  }

  reflect1(a: Vector3D, u: Vector3D, self?: boolean): Vector3D {
    return this.add( u.mul( -2 * this.sub(a).dot(u) ), self );
  }

  cross(v: Vector3D): Vector3D {
    return new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  add(v: Vector3D, self ?: boolean): Vector3D {
    if ( self ) {
      this.x += v.x; this.y += v.y; this.z += v.z;
      return this;
    }
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3D, self ?: boolean): Vector3D {
    if ( self ) {
      this.x -= v.x; this.y -= v.y; this.z -= v.z;
      return this;
    }
    return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(f: number, self ?: boolean): Vector3D {
    if ( self ) {
      this.x *= f; this.y *= f; this.z *= f;
      return this;
    }
    return new Vector3D(this.x * f, this.y * f, this.z * f);
  }

  div(f: number, self ?: boolean): Vector3D {
    if ( self ) {
      this.x /= f; this.y /= f; this.z /= f;
      return this;
    }
    return new Vector3D(this.x / f, this.y / f, this.z / f);
  }

  rotate(O: Vector3D, u: Vector3D, ang: number, self ?: boolean): Vector3D {
    const CA = Math.cos(ang / 2);
    const SA = Math.sin(ang / 2);
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
      return this.div(len);
    }
    return new Vector3D(1, 0, 0);
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
    let coords = [ this.x, this.y, this.z ].map(e => Math.abs(e) < 1e-6 ? 0 : Math.sign(e) );
    this.x = coords[0];
    this.y = coords[1];
    this.z = coords[2];
    return this;
  }

}

export const CENTER = new Vector3D(0, 0, 0);

export const RIGHT = new Vector3D(1, 0, 0);
export const LEFT = new Vector3D(-1, 0, 0);

export const FRONT = new Vector3D(0, 0, 1);
export const BACK = new Vector3D(0, 0, -1);

export const UP = new Vector3D(0, 1, 0);
export const DOWN = new Vector3D(0, -1, 0);