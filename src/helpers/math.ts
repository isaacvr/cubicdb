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