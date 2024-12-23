import type { Vector3D } from "@classes/vector3d";
import { bezier } from "@helpers/math";

export class BezierCurve {
  anchors: Vector3D[];
  resolution: number;

  constructor(pts: Vector3D[], resolution = 10) {
    this.anchors = pts.map(p => p.clone());
    this.resolution = resolution;
  }

  getPoints(): Vector3D[] {
    return bezier(this.anchors, this.resolution);
  }

  add(v: Vector3D, self = false) {
    if (self) {
      this.anchors.forEach(a => a.add(v, self));
      return this;
    }

    const na = this.anchors.map(a => a.add(v, self));

    return new BezierCurve(na, this.resolution);
  }

  sub(v: Vector3D, self = false) {
    if (self) {
      this.anchors.forEach(a => a.sub(v, self));
      return this;
    }

    const na = this.anchors.map(a => a.sub(v, self));

    return new BezierCurve(na, this.resolution);
  }

  mul(n: number, self = false) {
    if (self) {
      this.anchors.forEach(a => a.mul(n, self));
      return this;
    }

    const na = this.anchors.map(a => a.mul(n, self));

    return new BezierCurve(na, this.resolution);
  }

  div(n: number, self = false) {
    if (self) {
      this.anchors.forEach(a => a.div(n, self));
      return this;
    }

    const na = this.anchors.map(a => a.div(n, self));

    return new BezierCurve(na, this.resolution);
  }

  rotate(center: Vector3D, u: Vector3D, ang: number, self = false) {
    if (self) {
      this.anchors.forEach(a => a.rotate(center, u, ang, self));
      return this;
    }

    const na = this.anchors.map(a => a.rotate(center, u, ang, self));

    return new BezierCurve(na, this.resolution);
  }

  clone() {
    return new BezierCurve(this.anchors, this.resolution);
  }
}
