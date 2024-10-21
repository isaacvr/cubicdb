import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { BACK, CENTER, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import { drawStickers } from "./utils";
import { SVGGenerator } from "./classes/SVGGenerator";
import { CanvasGenerator } from "./classes/CanvasGenerator";

function pointing(st: Sticker, vec: Vector3D): boolean {
  if (st.color === "d") return false;
  return st.getOrientation().sub(vec).abs() < EPS;
}

function adjustRotation(st: Sticker, self = false): Sticker {
  return st.rotate(CENTER, UP, -Math.PI / 4, self).rotate(CENTER, RIGHT, Math.PI / 6, self);
}

export function birdView(cube: Puzzle, DIM: number, format: "raster" | "svg" = "raster"): string {
  const W = DIM * 2;
  const H = DIM;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const LW = Math.max(2, DIM / 100);
  const ctx = format === "raster" ? new CanvasGenerator(W, H) : new SVGGenerator(W, H);

  roundCorners(cube.p, ...cube.p.roundParams);

  let allStickers = cube.p.pieces.reduce((acc, e) => [...acc, ...e.stickers], <Sticker[]>[]);
  let leftSticker = allStickers
    .filter(st => pointing(st, LEFT))
    .map(st => adjustRotation(st.rotate(new Vector3D(-1, 1, 1), UP, PI_2), true));

  let backSticker = allStickers
    .filter(st => pointing(st, BACK))
    .map(st => adjustRotation(st.rotate(new Vector3D(1, 1, -1), UP, -PI_2), true));

  let restStickers = allStickers
    .filter(st => !pointing(st, LEFT) && !pointing(st, BACK) && st.color != "d")
    .map(st => adjustRotation(st));

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LW;

  drawStickers(ctx, [...leftSticker, ...backSticker, ...restStickers], [], W, H, cube);

  return ctx.getImage();
}
