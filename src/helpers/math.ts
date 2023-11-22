import { Color } from "@classes/Color";
import type { Vector3D } from "@classes/vector3d";

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