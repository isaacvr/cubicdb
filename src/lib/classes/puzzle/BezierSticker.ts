import { CENTER, Vector3D } from "@classes/vector3d";
import { Sticker } from "./Sticker";
import { BezierCurve } from "./BezierCurve";
import { EPS } from "@constants";
import { rotateBundle } from "@helpers/math";

export class BezierSticker extends Sticker {
  parts: (Vector3D | BezierCurve)[] = [];

  constructor(pts?: Vector3D[]) {
    super(pts);
  }

  getPoints() {
    return this.parts.reduce(
      (acc, e) => [...acc, ...(e instanceof BezierCurve ? e.getPoints() : [e])],
      [] as Vector3D[]
    );
  }

  add(ref: Vector3D, self?: boolean): BezierSticker {
    if (self) {
      this.points.forEach(p => p.add(ref, self));
      this.parts.forEach(p => p.add(ref, self));
      return this;
    }

    let st = new BezierSticker(this.points.map(p => p.add(ref)));
    st.parts = this.parts.map(p => p.add(ref));

    return st;
  }

  sub(ref: Vector3D, self?: boolean): BezierSticker {
    if (self) {
      this.points.forEach(p => p.sub(ref, self));
      this.parts.forEach(p => p.sub(ref, self));
      return this;
    }

    let st = new BezierSticker(this.points.map(p => p.sub(ref)));
    st.parts = this.parts.map(p => p.sub(ref));

    return st;
  }

  mul(num: number, self?: boolean): BezierSticker {
    if (self) {
      this.points.forEach(p => p.mul(num, self));
      this.parts.forEach(p => p.mul(num, self));
      return this;
    }

    let st = new BezierSticker(this.points.map(p => p.mul(num)));
    st.parts = this.parts.map(p => p.mul(num));

    return st;
  }

  rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean, col?: string): Sticker {
    if (Math.abs(ang % (Math.PI * 2)) < EPS) {
      return self ? this : this.clone();
    }

    if (self) {
      this.points.forEach(e => e.rotate(ref, dir, ang, true));
      this.parts.forEach(e => e.rotate(ref, dir, ang, true));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      this.color = col || this.color;
      return this;
    }

    let res = this.clone(true) as BezierSticker;
    res.points = this.points.map(e => e.rotate(ref, dir, ang));
    res.parts = this.parts.map(e => e.rotate(ref, dir, ang));
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.oColor = res.oColor;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    return res;
  }

  rotateBundle(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean, col?: string): Sticker {
    if (Math.abs(ang % (Math.PI * 2)) < EPS) {
      return self ? this : this.clone();
    }

    const points = rotateBundle(this.points, ref, dir, ang) as Vector3D[];

    if (self) {
      this.points.forEach((e, p) => e.setCoords(points[p].x, points[p].y, points[p].z));
      this.parts.forEach(pt => pt.rotate(ref, dir, ang, true));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      this.color = col || this.color;
      return this;
    }

    let res = this.clone(true) as BezierSticker;
    res.points = points;
    res.parts = this.parts.map(p => p.rotate(ref, dir, ang));
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    return res;
  }
}
