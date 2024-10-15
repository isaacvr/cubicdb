import type { Vector3D } from "@classes/vector3d";
import { Sticker } from "./Sticker";

export class ImageSticker extends Sticker {
  url: string;
  scale: number;

  constructor(
    url: string,
    pts?: Vector3D[],
    color?: string,
    vecs?: Vector3D[],
    nonInteractive?: boolean,
    scale = 1
  ) {
    super(pts, color, vecs, nonInteractive);
    this.url = url;
    this.scale = scale;
  }

  clone() {
    return new ImageSticker(
      this.url,
      this.points,
      this.color,
      this.vecs,
      this.nonInteractive,
      this.scale
    );
  }
}
