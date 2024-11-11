import { EPS } from "@constants";
import { Vector3D } from "./../vector3d";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";

export class FaceSticker extends Sticker {
  faces: number[][];
  constructor(pts: Vector3D[], faces: number[][], color?: string, vecs?: Vector3D[]) {
    super(pts, color, vecs);
    this.faces = faces.map(e => e.map(e1 => e1));
  }

  getOrientation(): Vector3D {
    let num = this.faces.length;
    let sum = this.faces.reduce((ac, f) => {
      return ac.add(Vector3D.cross(this.points[f[0]], this.points[f[1]], this.points[f[2]]).unit());
    }, new Vector3D());
    return sum.div(num, true).unit();
  }

  clone(excludePoints?: boolean): FaceSticker {
    let s = new FaceSticker(excludePoints ? [] : this.points, this.faces);
    s.color = this.color;
    s.oColor = this.oColor;
    s._cached_mass_center = this._cached_mass_center.clone();
    s.vecs = this.vecs.map(e => e.clone());
    return s;
  }

  reverse(self?: boolean): FaceSticker {
    if (self) {
      this.faces.forEach(fc => {
        let parts = [fc[0], fc[1], fc[2]];
        fc[1] = parts[2];
        fc[2] = parts[1];
      });
      return this;
    }

    let s = this.clone();
    s.faces.forEach(fc => {
      let parts = [fc[0], fc[1], fc[2]];
      fc[1] = parts[2];
      fc[2] = parts[1];
    });
    return s;
  }
}
