import type { Vector3D } from "@classes/vector3d";
import { Sticker } from "./Sticker";

export class CoreSticker extends Sticker {
  constructor(pts: Vector3D[]) {
    super(pts, "d", []);
  }

  clone(excludePoints?: boolean): CoreSticker {
    let s = new CoreSticker(excludePoints ? [] : this.points);
    s._cached_mass_center = this._cached_mass_center.clone();
    s.vecs = this.vecs.map(e => e.clone());
    return s;
  }
}
