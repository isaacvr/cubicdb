import { randomUUID } from "@helpers/strings";
import { CENTER, Vector3D } from "../vector3d";
import type { Sticker } from "./Sticker";
import { rotateBundle } from "@helpers/math";
import { EPS } from "@constants";
import type { VectorLike3D } from "@interfaces";
import { TextSticker } from "./TextSticker";

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
  stickers: Sticker[];
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

    let sum = this.stickers.reduce(
      (s, st) => s.add(st.getMassCenter().mul(st.points.length), true),
      new Vector3D()
    );

    let points = this.stickers.reduce((acc, st) => acc + st.points.length, 0);

    this._cached_mass_center = sum.div(points || 1);

    return this._cached_mass_center;
  }

  get length(): number {
    return this.stickers.length;
  }

  get totalPoints(): number {
    let res = 0;
    let stickers = this.stickers;
    for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
      res += stickers[i].points.length;
    }
    return res;
  }

  getAllGeneratorPoints(): Vector3D[] {
    let res = [];
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      res.push(...this.stickers[i]._generator.points);
    }
    return res;
  }

  getAllPoints(): Vector3D[] {
    let res = [];
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
    let st = this.stickers;

    if (self) {
      let pts: Vector3D[] = [];

      for (let i = 0, maxi = st.length; i < maxi; i += 1) {
        let p = st[i].points;

        for (let j = 0, maxj = p.length; j < maxj; j += 1) {
          pts.push(p[j]);
        }
      }

      let pts1 = rotateBundle(pts, ref, dir, ang);

      for (let i = 0, maxi = pts.length; i < maxi; i += 1) {
        pts[i].setCoords(pts1[i].x, pts1[i].y, pts1[i].z);
      }

      for (let i = 0, maxi = st.length; i < maxi; i += 1) {
        st[i].partialRotation(ref, dir, ang, true);
      }

      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.anchor.rotate(ref, dir, ang, true).toNormal();
      return this;
    }

    let pc = new Piece();
    pc.stickers = st.map(s => {
      let res = s.rotateBundle(ref, dir, ang);
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
    let dirs = [0, 0, 0];
    let st = this.stickers;
    let len = 0;
    let fn = disc || (() => true);

    for (let i = 0, maxi = st.length; i < maxi; i += 1) {
      if (st[i].nonInteractive || st[i] instanceof TextSticker) continue;

      if (fn(st[i])) {
        len += 1;
        let d = st[i].direction1(anchor, u, useMassCenter);
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
    let res = this.clone();
    res.stickers = res.stickers.map(s => s.reflect(p1, p2, p3));
    res.anchor && (res.anchor = res.anchor.reflect(p1, p2, p3));
    // res.computeBoundingBox();
    if (preserveOrientation) {
      res.stickers.forEach(s => s.reverse(true));
    }
    return res;
  }

  reflect1(a: Vector3D, u: Vector3D, preserveOrientation?: boolean): Piece {
    let res = this.clone();
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
    let res = new Piece(this.stickers);
    if (withCallback && this.hasCallback) {
      res.hasCallback = this.hasCallback;
      res.callback = this.callback;
    }
    res.anchor = this.anchor.clone();
    res.allPointsRef = this.allPointsRef.map(e => e.slice());
    return res;
  }

  equal(p1: Piece): boolean {
    let s1 = this.stickers;
    let s2 = p1.stickers;

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
    if (this.direction1(p0, n) != 0) return [];

    let inters = [];
    const stickers = this.stickers;

    for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
      let it = stickers[i].cutPlane(p0, n);

      if (it.intersection) {
        inters.push(it);
      }
    }

    function simplify(path: Vector3D[][]): Vector3D[][] {
      let sPath: Vector3D[][] = [];

      for (let i = 0, maxi = path.length; i < maxi; i += 1) {
        let fnd = false;

        for (let j = 0, maxj = sPath.length; j < maxj && !fnd; j += 1) {
          if (sPath[j][0].sub(path[i][0]).abs() < EPS) {
            sPath[j].unshift(path[i][1]);
            fnd = true;
          } else if (sPath[j][path[j].length - 1].sub(path[i][0]).abs() < EPS) {
            sPath[j].push(path[i][1]);
            fnd = true;
          }
        }

        if (!fnd) {
          sPath.push(path[i]);
        }
      }

      if (sPath.length <= 1) return sPath;
      return simplify(sPath);
    }

    console.log("sPath: ", simplify(inters.map(it => it.points)));

    return inters;
  }

  exact(p1: Piece): boolean {
    return this.id === p1.id;
  }

  computeBoundingBox(): Vector3D[] {
    let bbs = this.stickers.map(s => s.computeBoundingBox());
    let box = bbs.reduce(
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
