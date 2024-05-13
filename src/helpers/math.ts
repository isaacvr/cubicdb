import { Color } from "@classes/Color";
import { Vector2D } from "@classes/vector2-d";
import { Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import { Quaternion, Vector3 } from "three";

export function map(v: number, a: number, b: number, A: number, B: number): number {
  return b === a ? A : (v - a) * (B - A) / (b - a) + A;
}

export function evalLine(x: number, x1: number, y1: number, x2: number, y2: number): number {
  return map(x, x1, x2, y1, y2);
}

export function evalLineMN(x: number, m: number, n: number): number {
  return m * x + n;
}

export function cos(a: number): number {
  return Math.cos(a);
}

export function sin(a: number): number {
  return Math.sin(a);
}

export function rotatePoint(x: number, y: number, ang: number): number[] {
  return [ x * cos(ang) - y * sin(ang), x * sin(ang) + y * cos(ang) ];
}

export function rotateSegment(x1: number, y1: number, x2: number, y2: number, ang: number, ox: number, oy: number): number[] {
  let p1 = rotatePoint(x1 - ox, y1 - oy, ang);
  let p2 = rotatePoint(x2 - ox, y2 - oy, ang);
  return [ p1[0] + ox, p1[1] + oy, p2[0] + ox, p2[1] + oy ];
}

export function between(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

export function isBetween(n: number, a: number, b: number, inclusive = true): boolean {
  let v = Math.sign(n - a) * Math.sign(n - b);
  return inclusive ? v <= 0 : v < 0;
}

export function planeLineIntersection(p0: Vector3D, n: Vector3D, l0: Vector3D, l: Vector3D): Vector3D | null | undefined {
  let num = p0.sub(l0).dot(n);
  let den = l.dot(n);

  if ( den === 0 ) {
    return null;
  }

  if ( num === 0 ) {
    return undefined;
  }

  return l0.add( l.mul(num / den) );
}

export function search(v: number, arr: number[], bound?: boolean): number {
  let ini = 0, fin = arr.length;

  while (ini < fin) {
    let mid = (ini + fin) >> 1;

    if ( !bound && arr[mid] === v ) {
      return mid;
    }

    if ( arr[mid] < v ) {
      ini = mid + 1;
    } else {
      fin = mid;
    } 
  }

  return bound ? ini : -1;
}

export function minmax(v: number, a: number, b: number) {
  return Math.max(a, Math.min(v, b));
}

export function calcPercents(st: number[], time: number) {
  let acc = 0;
  let solveSteps = [];

  for (let i = 0, maxi = st.length; i < maxi; i += 1) {
    let perc = st[i] * 100 / time;
    let newV = Math.round(perc + acc);
    acc = perc - newV;
    solveSteps.push(newV);
  }

  return solveSteps;
}

export function getPixelCoord(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

export function getPixelInfo(x: number, y: number, d: ImageData): Color {
  let idx = getPixelCoord(x, y, d.width);
  let data = d.data;

  return new Color(data[idx], data[idx + 1], data[idx + 2]);
}

export function colorDistance(a: Color, b: Color): number {
  let c1 = a.color;
  let c2 = b.color;
  
  return c1.map((e, p) => (e - c2[p]) ** 2).reduce((a, b) => a + b, 0);
}

export function lineIntersection2D(a: Vector2D, _ua: Vector2D, b: Vector2D, _ub: Vector2D): Vector2D | null {
  let ua = _ua.unit();
  let ub = _ub.unit();

  if ( Math.abs( Vector2D.cross(ua, ub) ) < EPS ) return null;

  let D = ua.y * ub.x - ua.x * ub.y;
  let D1 = (b.y - a.y) * ub.x - (b.x - a.x) * ub.y;

  let t1 = D1 / D;

  return a.add( ua.mul(t1) );
}

export function lineIntersection3D(a: Vector3D, ua: Vector3D, b: Vector3D, ub: Vector3D): Vector3D | null {
  let v1 = ua.cross(ub);
  let v2 = b.sub(a).cross(ub);

  if ( v1.abs() < EPS ) return null;

  let r = v2.abs() / v1.abs();

  if ( v1.mul(r).sub(v2).abs() < EPS ) {
    return a.add( ua.mul(r) );
  }

  if ( v1.mul(-r).sub(v2).abs() < EPS ) {
    return a.add( ua.mul(-r) );
  }

  return null;
}

export function byteToString(b: number): string {
  const units = [ 'B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB' ];
  let nb = b;
  let u = 0;

  while ( nb >= 1000 && u < units.length - 1 ) {
    nb /= 1024;
    u += 1;
  }

  nb = Math.floor(nb * 100) / 100;

  return nb + ' ' + units[u];
}

export function rotateBundle(points: Vector3D[], O: Vector3D, u: Vector3D, ang: number): Vector3D[] {
  let q = new Quaternion().setFromAxisAngle(new Vector3(u.x, u.y, u.z).setLength(1), ang);
  return points.map(p => {
    let p1 = new Vector3(p.x - O.x, p.y - O.y, p.z - O.z).applyQuaternion(q);
    return new Vector3D(p1.x + O.x, p1.y + O.y, p1.z + O.z);
  });
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function toInt(n: number, d: number): number {
  let pot = 10 ** d;
  return Math.floor(n / pot) * pot;
}