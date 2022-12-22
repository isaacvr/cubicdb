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