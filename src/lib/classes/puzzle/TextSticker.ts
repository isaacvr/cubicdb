import type { Vector3D } from "@classes/vector3d";
import { Sticker } from "./Sticker";

export class TextSticker extends Sticker {
  text: string;

  constructor(
    pts: { 0: Vector3D; 1: Vector3D; 2: Vector3D; 3: Vector3D },
    text: string,
    color?: string
  ) {
    super([pts[0], pts[1], pts[2], pts[3]], color, [], true, "");
    this.text = text;
  }

  clone(): TextSticker {
    const pts = [this.points[0], this.points[1], this.points[2], this.points[3]] as const;
    return new TextSticker(pts, this.text, this.color);
  }
}
