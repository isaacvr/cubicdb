import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { CENTER, DOWN, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import { drawStickers } from "./utils";
import { getOColoredStickers } from "@classes/reconstructors/utils";
import type { Piece } from "@classes/puzzle/Piece";
import { SVGGenerator } from "./classes/SVGGenerator";
import { CanvasGenerator } from "./classes/CanvasGenerator";
import type { PuzzleType } from "@interfaces";

function pointing(st: Sticker, vec = UP): boolean {
  if (st.color === "d") return false;
  return st.getOrientation().sub(vec).abs() < EPS;
}

function nPointing(st: Sticker, vec = UP) {
  return !pointing(st, vec);
}

export function planView(cube: Puzzle, DIM: number, format: "raster" | "svg" = "raster"): string {
  const allowed: PuzzleType[] = ["rubik", "megaminx", "pyraminx"] as const;

  if (!allowed.includes(cube.type)) return "";

  const W = DIM;
  const H = DIM;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const LW = Math.max(2, DIM / 100);
  const SIDE_ANG = cube.type === "megaminx" ? PI - cube.p.raw[1] : PI_2;
  const ctx = format === "raster" ? new CanvasGenerator(W, H) : new SVGGenerator(W, H);

  roundCorners(cube.p, ...cube.p.roundParams);

  let pieces = cube.pieces;
  let topPieces: Piece[] = [];

  if (cube.type === "pyraminx") {
    topPieces = cube.p.pieces.filter(pc =>
      getOColoredStickers(pc).every(st => nPointing(st, DOWN))
    );
  } else {
    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      if (getOColoredStickers(pieces[i]).some(st => pointing(st))) {
        let pc = pieces[i];
        let st = getOColoredStickers(pieces[i]).find(st => nPointing(st));

        if (st && cube.p.toMove) {
          topPieces = cube.p.toMove(pc, st, UP).pieces;
          break;
        }
      }
    }
  }

  // Top face stickers
  let stickers: Sticker[] = [];
  let sideStikers: Sticker[] = [];

  if (cube.type === "pyraminx") {
    stickers = topPieces
      .reduce((a, b) => [...a, ...getOColoredStickers(b)], <Sticker[]>[])
      .map(st => st.rotate(CENTER, RIGHT, PI_2));
  } else {
    stickers = topPieces
      .reduce(
        (acc, e) => [...acc, ...getOColoredStickers(e).filter(st => pointing(st))],
        [] as Sticker[]
      )
      .map(s => s.rotate(CENTER, RIGHT, PI_2))
      .sort((a: Sticker, b: Sticker) => {
        let ca = a._generator.updateMassCenter(),
          cb = b._generator.updateMassCenter();

        if (Math.abs(ca.y - cb.y) < EPS) {
          return ca.x - cb.x;
        }

        return cb.y - ca.y;
      });

    sideStikers = topPieces
      .reduce(
        (acc, e) => [...acc, ...getOColoredStickers(e).filter(st => nPointing(st))],
        [] as Sticker[]
      )
      .map(s => {
        let o = s.getOrientation();
        let ac = s._generator;
        let a = ac.points.reduce((a, b) => (a.y > b.y ? a : b));
        let newS = s.rotate(a, o.cross(UP), SIDE_ANG);

        o.y = 0; // Always get the horizontal plane only

        const factor = cube.type === "megaminx" ? 1 / 2 : 2 / 3;

        let shrink = (V: Vector3D) => {
          let O = V.reflect1(a, o).add(V).div(2);
          return O.add(V.sub(O).mul(factor));
        };

        // Scale and move closer to the original sticker
        newS.points.forEach(p => {
          let s = shrink(p);
          p.setCoords(s.x, s.y, s.z);
        });
        return newS.rotate(CENTER, RIGHT, PI_2);
      });
  }

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LW;

  drawStickers(ctx, stickers, sideStikers, W, H, cube);

  return ctx.getImage();
}
