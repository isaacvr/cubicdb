import { UP, BACK, CENTER, RIGHT, Vector3D, FRONT, DOWN } from "./../vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { newArr } from "@helpers/object";

export function SQUARE1_STAR(): PuzzleInterface {
  const sq1Star: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: CENTER,
    faceVectors: [UP, DOWN],
    faceColors: ["green", "blue"],
    getAllStickers: getAllStickers,
    move: () => true,
    roundParams: {},
  };

  const PI = Math.PI;
  const PI_3 = PI / 3;
  const PI_6 = PI / 6;
  const R1 = 1 / 3;
  const R2 = 3 / 4;
  const R3 = 1;
  const POINTS = 30;
  const UP_FACE = UP.mul(R1);

  const pieces = sq1Star.pieces;

  // Center
  const centerSticker = new Sticker(
    [
      RIGHT.mul(R1),
      ...newArr(POINTS)
        .fill(0)
        .map((_, p) => RIGHT.mul(R1).rotate(CENTER, UP, (p * PI) / (POINTS - 1))),
      RIGHT.mul(-R1),
      RIGHT.mul(R1),
    ],
    "",
    [BACK]
  ).add(UP_FACE);

  const centerPiece = new Piece([centerSticker, centerSticker.rotate(CENTER, FRONT, PI)]);

  // Large piece
  const bsDir = RIGHT.mul(R3).rotate(CENTER, UP, PI_6).unit();
  const bigSticker = new Sticker(
    [
      RIGHT.mul(R3).rotate(CENTER, UP, PI_6),
      RIGHT.mul(R2).rotate(CENTER, UP, PI_3),
      ...newArr(POINTS)
        .fill(0)
        .map((_, p) => RIGHT.mul(R1).rotate(CENTER, UP, (1 - p / (POINTS - 1)) * PI_3)),
      RIGHT.mul(R2),
    ],
    "",
    [UP, bsDir]
  ).add(UP_FACE);

  const smallSticker = new Sticker(
    [
      RIGHT.mul(R2),
      RIGHT.mul(R3).rotate(CENTER, UP, PI_6),
      RIGHT.mul(R3).rotate(CENTER, UP, PI_6).add(UP_FACE),
      RIGHT.mul(R2).add(UP_FACE),
    ],
    "",
    [UP, bsDir]
  );

  const bigPiece = new Piece([
    bigSticker,
    smallSticker,
    smallSticker.reflect(
      CENTER,
      RIGHT.mul(R3).rotate(CENTER, UP, PI_6),
      RIGHT.mul(R3).rotate(CENTER, UP, PI_6).add(UP_FACE),
      true
    ),
  ]);

  pieces.push(centerPiece, centerPiece.rotate(CENTER, UP, PI));
  pieces.push(
    ...[0, 1, 2, 3, 4, 5].map(n => bigPiece.rotate(CENTER, UP, n * PI_3)),
    ...[0, 1, 2, 3, 4, 5].map(n => bigPiece.rotate(CENTER, UP, n * PI_3).rotate(CENTER, RIGHT, PI))
  );

  // let bInd = [2, 3, 4, 11, 12, 13];
  // pieces.forEach((p, p_i) => p.stickers.forEach(s => s.vecs = [ UP.clone() ]));
  // pieces.forEach((p, p_i) => p.stickers.forEach(s => s.vecs = [ UP.clone(), bInd.indexOf(p_i) > -1 ? BACK.clone() : FRONT.clone() ]))

  const sideColors = ["red", "violet", "white", "yellow", "pink", "orange"];

  for (let i = 0; i < 6; i += 1) {
    const p = bigPiece.rotate(CENTER, UP, i * PI_3);
    sq1Star.faceColors.push(sideColors[i], sideColors[i]);
    sq1Star.faceVectors.push(p.stickers[1].getOrientation(), p.stickers[2].getOrientation());
  }

  assignColors(sq1Star, sq1Star.faceColors);

  sq1Star.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const ang = dir.cross(UP).abs() < 1e-4 ? PI_3 : PI;
    let d = dir;

    if (ang > PI_3) {
      d = mc.dot(BACK) > 0 ? BACK : FRONT;
    }

    const toMovePieces = pieces.filter(
      p =>
        p.direction1(CENTER, d, true) >= 0 &&
        (ang > PI_3 ? true : p.stickers.some(s => s.getOrientation().cross(UP).abs() > 1e-4))
    );

    return {
      pieces: toMovePieces,
      ang,
      dir: d,
    };
  };

  sq1Star.scramble = function () {
    if (!sq1Star.toMove) return;

    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = sq1Star.toMove(p, s, vec) as ToMoveResult;
      const cant = FRONT.cross(pcs.dir!).abs() < EPS ? random(2) : 1 + random(5);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, pcs.dir!, pcs.ang * cant, true));
    }
  };

  sq1Star.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  return sq1Star;
}
