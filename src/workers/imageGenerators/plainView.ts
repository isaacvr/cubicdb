import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { Vector2D } from "@classes/vector2-d";
import { CENTER, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import { map } from "@helpers/math";
import { drawStickers } from "./utils";
import { getColoredStickers, getOColoredStickers } from "@classes/reconstructors/utils";

function colorFilter(st: Sticker): boolean {
  return st.color != "d";
}

function pointingUp(st: Sticker): boolean {
  if (st.color === "d") return false;
  return st.getOrientation().sub(UP).abs() < EPS;
}

function nPointingUp(st: Sticker) {
  return !pointingUp(st);
}

export async function planView(cube: Puzzle, DIM: number): Promise<Blob> {
  // if ( [ 'rubik', 'skewb', 'ivy' ].indexOf(cube.type) > -1 ) {
  if (["rubik"].indexOf(cube.type) > -1) {
    let canvas = document.createElement("canvas");
    canvas.width = DIM;
    canvas.height = DIM;
    let ctx: any = canvas.getContext("2d");
    const PI_2 = Math.PI / 2;
    const LW = Math.max(2, DIM / 100);

    roundCorners(cube.p, ...cube.p.roundParams);

    let topPieces = cube.pieces.filter(pc => getOColoredStickers(pc).some(pointingUp));

    // Top face stickers
    let stickers = topPieces
      .reduce((acc, e) => [...acc, ...getOColoredStickers(e).filter(pointingUp)], [] as Sticker[])
      .map(s => s.rotate(CENTER, RIGHT, PI_2))
      .sort((a: Sticker, b: Sticker) => {
        let ca = a._generator.updateMassCenter(),
          cb = b._generator.updateMassCenter();

        if (Math.abs(ca.y - cb.y) < EPS) {
          return ca.x - cb.x;
        }

        return cb.y - ca.y;
      });

    let sideStikers = topPieces
      .reduce((acc, e) => [...acc, ...getOColoredStickers(e).filter(nPointingUp)], [] as Sticker[])
      .map(s => {
        let o = s.getOrientation();
        let ac = s._generator;
        let a = ac.points.reduce((a, b) => a.y > b.y ? a : b);
        let newS = s.rotate(a, o.cross(UP), PI_2);

        const factor = 2 / 3;
        let muls = [o.x, o.y, o.z].map(n => (Math.abs(Math.abs(n) - 1) < 1e-2 ? factor : 1));

        // Scale and move closer to the original sticker
        newS.points.forEach(p => {
          p.x = (p.x - a.x) * muls[0] + a.x;
          p.y = (p.y - a.y) * muls[1] + a.y;
          p.z = (p.z - a.z) * muls[2] + a.z;
        });
        return newS.rotate(CENTER, RIGHT, PI_2);
      });

    ctx.strokeStyle = "7px solid #000000";
    ctx.lineWidth = LW;

    drawStickers(ctx, stickers, sideStikers, DIM, DIM, cube);

    return await new Promise(res => canvas.toBlob(b => res(b || new Blob([])), "image/jpg"));
  }

  return new Blob([]);
}
