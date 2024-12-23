import { randomUUID } from "@helpers/strings";
import { CENTER, Vector3D } from "../vector3d";
import { Sticker } from "./Sticker";
import { rotateBundle } from "@helpers/math";
import { EPS } from "@constants";
import type { VectorLike3D } from "@interfaces";
import { TextSticker } from "./TextSticker";
import { BezierSticker } from "./BezierSticker";

type CallbackFunction = (
  p: any,
  center: VectorLike3D,
  dir: VectorLike3D,
  ang: number,
  three?: boolean,
  vc?: any,
  ignoreUserData?: boolean
) => void;

export class Piece {
  stickers: (Sticker | BezierSticker)[];
  boundingBox: Vector3D[];
  hasCallback: boolean;
  callback: CallbackFunction;
  anchor: Vector3D;
  _cached_mass_center: Vector3D;
  raw: any;
  allPointsRef: number[][];
  _id: string;

  constructor(stickers?: Sticker[]) {
    this._id = randomUUID();
    this.stickers = (stickers || []).map(e => e.clone());
    this.hasCallback = false;
    this.callback = () => {};
    this.allPointsRef = [];
    this.boundingBox = [];
    this.anchor = CENTER.clone();
    this._cached_mass_center = CENTER.clone();
    this.updateMassCenter();
    this.computeBoundingBox();
  }

  get id() {
    return this._id;
  }

  updateMassCenter(recursive?: boolean): Vector3D {
    if (recursive) {
      this.stickers.forEach(s => s.updateMassCenter());
    }

    const sum = this.stickers.reduce(
      (s, st) => s.add(st.getMassCenter().mul(st.points.length), true),
      new Vector3D()
    );

    const points = this.stickers.reduce((acc, st) => acc + st.points.length, 0);

    this._cached_mass_center = sum.div(points || 1);

    return this._cached_mass_center;
  }

  get length(): number {
    return this.stickers.length;
  }

  get totalPoints(): number {
    let res = 0;
    const stickers = this.stickers;
    for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
      res += stickers[i].points.length;
    }
    return res;
  }

  getAllGeneratorPoints(): Vector3D[] {
    const res = [];
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      res.push(...this.stickers[i]._generator.points);
    }
    return res;
  }

  getAllPoints(): Vector3D[] {
    const res = [];
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      res.push(...this.stickers[i].points);
    }
    return res;
  }

  getMassCenter(cached: boolean = true): Vector3D {
    if (!cached) {
      this.updateMassCenter();
    }
    return this._cached_mass_center;
  }

  setColor(cols: string[]) {
    for (let i = 0, maxi = Math.min(cols.length, this.stickers.length); i < maxi; i += 1) {
      this.stickers[i].color = cols[i];
    }
  }

  add(ref: Vector3D, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.add(ref, true));
      this.boundingBox.forEach(s => s.add(ref, true));
      this._cached_mass_center.add(ref, true);
      this.anchor.add(ref, true);
      return this;
    }
    return this.clone().add(ref, true);
    // return new Piece(this.stickers.map(s => s.add(ref)));
  }

  sub(ref: Vector3D, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.sub(ref, true));
      this.boundingBox.forEach(s => s.sub(ref, true));
      this._cached_mass_center.sub(ref, true);
      this.anchor.sub(ref, true);
      return this;
    }
    return this.clone().sub(ref, true);
    // return new Piece(this.stickers.map(s => s.sub(ref)));
  }

  mul(f: number, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.mul(f, true));
      this.boundingBox.forEach(s => s.mul(f, true));
      this._cached_mass_center.mul(f, true);
      this.anchor.mul(f, true);
      return this;
    }
    return this.clone().mul(f, true);
  }

  div(f: number, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.div(f, true));
      this.boundingBox.forEach(s => s.div(f, true));
      this._cached_mass_center.div(f, true);
      this.anchor.div(f, true);
      return this;
    }

    return this.clone().div(f, true);
  }

  rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean): Piece {
    const st = this.stickers.filter(s => !(s instanceof BezierSticker)) as Sticker[];
    const bz = this.stickers.filter(s => s instanceof BezierSticker);

    if (self) {
      // Rotate pure stickers
      const pts: Vector3D[] = [];

      for (let i = 0, maxi = st.length; i < maxi; i += 1) {
        const p = st[i].points;

        for (let j = 0, maxj = p.length; j < maxj; j += 1) {
          pts.push(p[j]);
        }
      }

      const pts1 = rotateBundle(pts, ref, dir, ang) as Vector3D[];

      for (let i = 0, maxi = pts.length; i < maxi; i += 1) {
        pts[i].setCoords(pts1[i].x, pts1[i].y, pts1[i].z);
      }

      for (let i = 0, maxi = st.length; i < maxi; i += 1) {
        st[i].partialRotation(ref, dir, ang, true);
      }

      // Rotate Bezier stickers
      bz.forEach(s => s.rotate(ref, dir, ang, true));

      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.anchor.rotate(ref, dir, ang, true).toNormal();
      return this;
    }

    const pc = new Piece();
    pc.stickers = st.map(s => {
      const res = s.rotateBundle(ref, dir, ang);
      res.name = s.name;
      return res;
    });
    pc._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    pc.anchor = this.anchor.rotate(ref, dir, ang).toNormal();
    return pc;
  }

  direction(
    p1: Vector3D,
    p2: Vector3D,
    p3: Vector3D,
    useMassCenter?: boolean,
    disc?: Function
  ): -1 | 0 | 1 {
    return this.direction1(p1, Vector3D.cross(p1, p2, p3), useMassCenter, disc);
  }

  direction1(anchor: Vector3D, u: Vector3D, useMassCenter?: boolean, disc?: Function): -1 | 0 | 1 {
    const dirs = [0, 0, 0];
    const st = this.stickers;
    let len = 0;
    const fn = disc || (() => true);

    for (let i = 0, maxi = st.length; i < maxi; i += 1) {
      if (st[i].nonInteractive || st[i] instanceof TextSticker) continue;

      if (fn(st[i])) {
        len += 1;
        const d = st[i].direction1(anchor, u, useMassCenter);
        dirs[d + 1] += 1;

        if (!useMassCenter && d === 0) {
          return 0;
        }

        if (dirs[0] > 0 && dirs[2] > 0) {
          return 0;
        }
      }
    }

    return dirs[1] === len ? 0 : dirs[0] ? -1 : 1;
  }

  reflect(p1: Vector3D, p2: Vector3D, p3: Vector3D, preserveOrientation?: boolean): Piece {
    const res = this.clone();
    res.stickers = res.stickers.map(s => s.reflect(p1, p2, p3));
    res.anchor && (res.anchor = res.anchor.reflect(p1, p2, p3));
    // res.computeBoundingBox();
    if (preserveOrientation) {
      res.stickers.forEach(s => s.reverse(true));
    }
    return res;
  }

  reflect1(a: Vector3D, u: Vector3D, preserveOrientation?: boolean): Piece {
    const res = this.clone();
    res.stickers = res.stickers.map(s => s.reflect1(a, u));
    res.anchor && (res.anchor = res.anchor.reflect1(a, u));
    // res.computeBoundingBox();
    if (preserveOrientation) {
      res.stickers.forEach(s => s.reverse(true));
    }
    return res;
    // return new Piece(
    //   this.stickers.map(s => s.reflect1(a, u, preserveOrientation))
    // );
  }

  reverse(): Piece {
    return new Piece(this.stickers.map(s => s.reverse()));
  }

  contains(col: string): boolean {
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      if (this.stickers[i].color === col || this.stickers[i].oColor === col) {
        return true;
      }
    }

    return false;
  }

  clone(withCallback?: boolean) {
    const res = new Piece(this.stickers);
    if (withCallback && this.hasCallback) {
      res.hasCallback = this.hasCallback;
      res.callback = this.callback;
    }
    res.anchor = this.anchor.clone();
    res.allPointsRef = this.allPointsRef.map(e => e.slice());
    return res;
  }

  equal(p1: Piece): boolean {
    const s1 = this.stickers;
    const s2 = p1.stickers;

    if (s1.length != s2.length) {
      return false;
    }

    for (let i = 0, maxi = s1.length; i < maxi; i += 1) {
      if (!s1[i].equal(s2[i])) {
        return false;
      }
    }

    return true;
  }

  cutPlane(p0: Vector3D, n: Vector3D) {
    if (this.direction1(p0, n) != 0) return [this];

    const inters = [];
    const stickers = this.stickers;
    const nonIntersStickers: Sticker[] = [];

    for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
      const it = stickers[i].cutPlane(p0, n);

      if (it.intersection) {
        inters.push(it);
      } else {
        nonIntersStickers.push(stickers[i]);
      }
    }

    function simplify(paths: Vector3D[][]): Vector3D[][] {
      const sPaths: Vector3D[][] = [];

      for (let i = 0, maxi = paths.length; i < maxi; i += 1) {
        let fnd = false;
        const path = paths[i];
        const pIni = path[0];
        const pFin = path[path.length - 1];

        for (let j = 0, maxj = sPaths.length; j < maxj && !fnd; j += 1) {
          const sPath = sPaths[j];
          const spIni = sPath[0];
          const spFin = sPath[sPath.length - 1];

          if (pIni.equals(spIni)) {
            path.slice(1).forEach(p => sPath.unshift(p));
            fnd = true;
          } else if (pIni.equals(spFin)) {
            path.slice(1).forEach(p => sPath.push(p));
            fnd = true;
          } else if (pFin.equals(spIni)) {
            path
              .reverse()
              .slice(1)
              .forEach(p => sPath.unshift(p));
            fnd = true;
          } else if (pFin.equals(spFin)) {
            path
              .reverse()
              .slice(1)
              .forEach(p => sPath.push(p));
            fnd = true;
          }
        }

        if (!fnd) {
          sPaths.push(paths[i]);
        }
      }

      if (sPaths.length <= 1) return sPaths;
      return simplify(sPaths);
    }

    const path = simplify(inters.map(it => it.points.slice()))[0];

    if (path.length > 1 && path[0].sub(path[path.length - 1]).abs() < EPS) {
      path.pop();
    }

    if (inters.length) {
      const allStickers = inters.reduce((acc, e) => [...acc, ...e.parts], nonIntersStickers);
      const interSticker = new Sticker(path);
      const o = interSticker.getOrientation();

      // Same direction / Opposite direction
      const res: Piece[] = [new Piece([interSticker]), new Piece([interSticker.reverse()])];

      for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
        const mc = allStickers[i].getMassCenter();

        if (o.dot(mc.sub(p0)) < 0) {
          res[0].stickers.push(allStickers[i]);
        } else {
          res[1].stickers.push(allStickers[i]);
        }
      }

      return res;
    }

    return [this];
  }

  exact(p1: Piece): boolean {
    return this.id === p1.id;
  }

  computeBoundingBox(): Vector3D[] {
    const bbs = this.stickers.map(s => s.computeBoundingBox());
    const box = bbs.reduce(
      (ac, p) => {
        return [
          Math.min(ac[0], p[0].x),
          Math.min(ac[1], p[0].y),
          Math.min(ac[2], p[0].z),
          Math.max(ac[3], p[1].x),
          Math.max(ac[4], p[1].y),
          Math.max(ac[5], p[1].z),
        ];
      },
      [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    );

    this.boundingBox = [new Vector3D(box[0], box[1], box[2]), new Vector3D(box[3], box[4], box[5])];

    return this.boundingBox;
  }
}
