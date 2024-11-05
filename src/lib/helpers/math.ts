import { Color } from "@classes/Color";
import type { BezierCurve } from "@classes/puzzle/BezierCurve";
import { Vector2D } from "@classes/vector2-d";
import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import type { EasingFunction } from "@interfaces";

export function map(v: number, a: number, b: number, A: number, B: number): number {
  return b === a ? A : ((v - a) * (B - A)) / (b - a) + A;
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
  return [x * cos(ang) - y * sin(ang), x * sin(ang) + y * cos(ang)];
}

export function rotateSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ang: number,
  ox: number,
  oy: number
): number[] {
  let p1 = rotatePoint(x1 - ox, y1 - oy, ang);
  let p2 = rotatePoint(x2 - ox, y2 - oy, ang);
  return [p1[0] + ox, p1[1] + oy, p2[0] + ox, p2[1] + oy];
}

export function between(n: number, a: number, b: number): number {
  let na = Math.min(a, b);
  let nb = Math.max(a, b);
  return Math.min(nb, Math.max(na, n));
}

export function isBetween(n: number, a: number, b: number, inclusive = true): boolean {
  let v = Math.sign(n - a) * Math.sign(n - b);
  return inclusive ? v <= 0 : v < 0;
}

export function planeLineIntersection(
  p0: Vector3D,
  n: Vector3D,
  l0: Vector3D,
  l: Vector3D
): Vector3D | null | undefined {
  let num = p0.sub(l0).dot(n);
  let den = l.dot(n);

  if (den === 0) {
    return null;
  }

  if (num === 0) {
    return undefined;
  }

  return l0.add(l.mul(num / den));
}

export function search(v: number, arr: number[], bound?: boolean): number {
  let ini = 0,
    fin = arr.length;

  while (ini < fin) {
    let mid = (ini + fin) >> 1;

    if (!bound && arr[mid] === v) {
      return mid;
    }

    if (arr[mid] < v) {
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
    let perc = (st[i] * 100) / time;
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

export function lineIntersection2D(
  a: Vector2D,
  _ua: Vector2D,
  b: Vector2D,
  _ub: Vector2D
): Vector2D | null {
  let ua = _ua.unit();
  let ub = _ub.unit();

  if (Math.abs(Vector2D.cross(ua, ub)) < EPS) return null;

  let D = ua.y * ub.x - ua.x * ub.y;
  let D1 = (b.y - a.y) * ub.x - (b.x - a.x) * ub.y;

  let t1 = D1 / D;

  return a.add(ua.mul(t1));
}

export function lineIntersection3D(
  a: Vector3D,
  ua: Vector3D,
  b: Vector3D,
  ub: Vector3D
): Vector3D | null {
  let v1 = ua.cross(ub);
  let v2 = b.sub(a).cross(ub);

  if (v1.abs() < EPS) return null;

  let r = v2.abs() / v1.abs();

  if (v1.mul(r).sub(v2).abs() < EPS) {
    return a.add(ua.mul(r));
  }

  if (v1.mul(-r).sub(v2).abs() < EPS) {
    return a.add(ua.mul(-r));
  }

  return null;
}

export function byteToString(b: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let nb = b;
  let u = 0;

  while (nb >= 1000 && u < units.length - 1) {
    nb /= 1024;
    u += 1;
  }

  nb = Math.floor(nb * 100) / 100;

  return nb + " " + units[u];
}

export function rotateBundle(
  points: (Vector3D | BezierCurve)[],
  O: Vector3D,
  u: Vector3D,
  ang: number
): (Vector3D | BezierCurve)[] {
  return points.map(p => p.rotate(O, u, ang));
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function toInt(n: number, d: number): number {
  let pot = 10 ** d;
  return Math.floor(n / pot) * pot;
}

export function getLagrangeInterpolation(pts: Vector2D[]) {
  let funcs = pts.map((pt, pos) => {
    let otherPts = pts.filter((_, pos1) => pos1 != pos);
    return (x: number) => pt.y * otherPts.reduce((acc, p) => (acc * (x - p.x)) / (pt.x - p.x), 1);
  });

  return (x: number) => funcs.reduce((acc, f) => acc + f(x), 0);
}

// Animation Timing Functions
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  let p1 = new Vector2D(0, 0);
  let p2 = new Vector2D(x1, y1);
  let p3 = new Vector2D(x2, y2);
  let p4 = new Vector2D(1, 1);

  return p1.mul((1 - t) ** 3).add(
    p2
      .mul(3 * t)
      .mul((1 - t) ** 2)
      .add(
        p3
          .mul(3 * t ** 2)
          .mul(1 - t)
          .add(p4.mul(t ** 3))
      )
  ).y;
}

export function ease(t: number): number {
  return cubicBezier(t, 0.25, 0.1, 0.25, 1);
}

export function linear(t: number): number {
  return cubicBezier(t, 0, 0, 1, 1);
}

export function easeIn(t: number): number {
  return cubicBezier(t, 0.42, 0, 1, 1);
}

export function fastEasing(t: number): number {
  const DIVIDER = 10;
  const THRESHOLD = 1 / DIVIDER;
  return t < THRESHOLD ? cubicBezier(t * DIVIDER, 0.44, 0.48, 0, 1) : 1;
}

export function easeOut(t: number): number {
  return cubicBezier(t, 0, 0, 0.58, 1);
}

export function easeInOut(t: number): number {
  return cubicBezier(t, 0.42, 0, 0.58, 1);
}

export function getEasing(name: EasingFunction) {
  if (name === "ease") return ease;
  if (name === "easeIn") return easeIn;
  if (name === "easeInOut") return easeInOut;
  if (name === "easeOut") return easeOut;
  if (name === "fastEasing") return fastEasing;
  return linear;
}

export function bitLength(n: number): number {
  let bits = 0;
  while (1 << bits <= n) bits += 1;
  return bits;
}

export function pascal(n: number) {
  if (n <= 0) return [1];

  let res = [[1], []];
  let cur = 1;

  for (let i = 1; i <= n; i += 1) {
    res[cur] = res[1 - cur].map((n, p, a) => (p === 0 ? 1 : n + a[p - 1]));
    res[cur].push(1);
    cur ^= 1;
  }

  return res[1 - cur];
}

export function bezier(pts: Vector3D[], points: number): Vector3D[] {
  let res: Vector3D[] = [];
  let n = pts.length - 1;
  let Cnk = pascal(n);

  for (let j = 0; j <= points; j += 1) {
    let a = j / points;
    res.push(
      pts.reduce((ac: Vector3D, p: Vector3D, pos: number) => {
        return ac.add(p.mul(Cnk[pos] * Math.pow(1 - a, n - pos) * Math.pow(a, pos)), true);
      }, new Vector3D())
    );
  }

  return res;
}

// Circle that goes through p1 and p3 with p1p2 and p2p3 being tangent to the circle
export function circle(p1: Vector3D, p2: Vector3D, p3: Vector3D, PPC: number): Vector3D[] {
  const PI_2 = Math.PI / 2;
  let P = [p1, p2, p3];
  let v1 = p1.sub(p2);
  let v2 = p3.sub(p2);

  let u = Vector3D.cross(P[0], P[1], P[2]).unit();

  if (Math.abs(v1.abs() - v2.abs()) < EPS) {
    let center = lineIntersection3D(
      P[0],
      v1.rotate(CENTER, u, PI_2),
      P[2],
      v2.rotate(CENTER, u, PI_2)
    );

    if (center) {
      let sides = [v1.abs(), v2.abs(), v1.sub(v2).abs()];
      let ang =
        Math.PI -
        Math.acos((sides[2] ** 2 - sides[0] ** 2 - sides[1] ** 2) / (-2 * sides[0] * sides[1]));
      let pts: Vector3D[] = [];

      for (let j = 0; j <= PPC; j += 1) {
        let a = j / PPC;
        pts.push(P[0].rotate(center, u, a * ang));
      }

      return pts;
    }
  }

  return bezier(P, PPC);
}

export function cmd(command: string, command1: string = "", len: number = 0) {
  const dirMap: any = {
    U: UP,
    R: RIGHT,
    F: FRONT,
    D: DOWN,
    L: LEFT,
    B: BACK,
  };

  let sum = command
    .split("")
    .filter(c => c in dirMap)
    .reduce((acc, c) => acc.add(dirMap[c], true), new Vector3D());

  let sum1 = command1
    .split("")
    .filter(c => c in dirMap)
    .reduce((acc, c) => acc.add(dirMap[c], true), new Vector3D());

  return sum.add(sum1.mul(len), true);
}

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
