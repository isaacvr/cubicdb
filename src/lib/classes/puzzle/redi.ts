import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function REDI(): PuzzleInterface {
  const redi: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => true,
    dims: [],
    roundParams: {},
  };

  redi.getAllStickers = getAllStickers.bind(redi);

  const PI = Math.PI;
  const PI_3 = PI / 3;
  const PI_2 = PI / 2;
  const ANG = 2 * PI_3;
  const RAD = Math.sqrt(5);
  const R1 = Math.sqrt((RAD - 1) ** 2 + (-RAD - 1) ** 2);
  const H = Math.sqrt(R1 ** 2 - RAD ** 2);

  const pieces = redi.pieces;
  const ref = LEFT.add(UP).add(BACK);

  const cornerSticker = new Sticker([
    ref,
    ref.add(FRONT.mul(2 / 3)),
    ref.add(FRONT.mul(2 / 3)).add(RIGHT.mul(2 / 3)),
    ref.add(RIGHT.mul(2 / 3)),
  ]);

  cornerSticker.vecs = [ref.unit()];

  const corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(ref, ref, ANG),
    cornerSticker.rotate(ref, ref, -ANG),
  ]);

  const arrowSticker = new Sticker([
    ref.add(FRONT.mul(2 / 3)),
    ref.add(FRONT.mul(4 / 3)),
    ref.add(FRONT.mul(4 / 3)).add(RIGHT.mul(2 / 3)),
    ref
      .add(FRONT.mul(4 / 3))
      .add(RIGHT)
      .add(BACK.mul(1 / 3)),
    ref
      .add(FRONT.mul(4 / 3))
      .add(RIGHT.mul(2 / 3))
      .add(BACK.mul(2 / 3)),
  ]);

  arrowSticker.vecs = [ref.unit(), LEFT.add(UP).add(FRONT).unit()];

  const arrowPiece = new Piece([arrowSticker, arrowSticker.rotate(LEFT.add(UP), LEFT.add(UP), PI)]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(corner.rotate(CENTER, UP, PI_2 * i));
    pieces.push(corner.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI));
  }

  for (let i = 0; i < 4; i += 1) {
    pieces.push(arrowPiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(arrowPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(arrowPiece.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI));
  }

  redi.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const c = new Vector3D(Math.sign(dir.x) / 2, Math.sign(dir.y) / 2, Math.sign(dir.z) / 2);
    const toMovePieces = pieces.filter(p => p.direction1(c, dir, true) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  const moveMaps = ["RLFBrlfbxyz", "_____LR_xyz"];

  const planes = [
    [RIGHT.add(DOWN), BACK.add(DOWN), RIGHT.add(BACK)], // R
    [FRONT.add(DOWN), FRONT.add(LEFT), LEFT.add(DOWN)], // L
    [FRONT.add(RIGHT), FRONT.add(DOWN), RIGHT.add(DOWN)], // F
    [LEFT.add(DOWN), LEFT.add(BACK), BACK.add(DOWN)], // B
    [RIGHT.add(UP), RIGHT.add(BACK), BACK.add(UP)], // r
    [FRONT.add(UP), LEFT.add(UP), FRONT.add(LEFT)], // l
    [FRONT.add(UP), FRONT.add(RIGHT), RIGHT.add(UP)], // f
    [LEFT.add(UP), BACK.add(UP), LEFT.add(BACK)], // b
    [CENTER, UP, FRONT].map(v => v.add(LEFT.mul(2))), // x
    [CENTER, FRONT, RIGHT].map(v => v.add(DOWN.mul(2))), // y
    [CENTER, UP, LEFT].map(v => v.add(BACK.mul(2))), // z
  ];

  redi.move = function (scramble: string[]) {
    const moves = scramble[0].match(new RegExp(`[${moveMaps[0]}]'?`, "g"));

    if (moves) {
      let variant = 0;

      // old notation
      if (moves.every(m => moveMaps[1].indexOf(m[0]) > -1)) {
        variant = 1;
      }

      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        const mv = moves[i];
        const moveId = moveMaps[variant].indexOf(mv[0]);
        const plane = planes[moveId];
        const u = Vector3D.cross(plane[0], plane[1], plane[2]).unit();
        const pcs = pieces.filter(p => p.direction1(plane[0], u) >= 0);
        let ang = Math.sign(mv.indexOf("'") + 0.1) * ANG;

        if (moveId > 7) {
          ang = (ang * 3) / 4;
        }

        pcs.forEach(p => p.rotate(CENTER, u, ang, true));
      }
    }

    return true;
  };

  redi.scramble = function () {
    if (!redi.toMove) return;

    const MOVES = 40;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = redi.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  redi.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  redi.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(redi, redi.faceColors);

  return redi;
}
