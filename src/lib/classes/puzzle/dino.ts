// Distortion at 330+ moves

import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { cmd } from "@helpers/math";

export function DINO(): PuzzleInterface {
  const dino: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["y", "o", "g", "w", "r", "b"],
    move: () => true,
    roundParams: {},
  };

  dino.getAllStickers = getAllStickers.bind(dino);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG = (2 * PI) / 3;

  const pieces = dino.pieces;
  const ref = cmd("LUB");

  const pieceLT = new Piece([
    new Sticker([cmd("LUB"), cmd("LUF"), UP]),
    new Sticker([cmd("LUB"), LEFT, cmd("LUF")]),
  ]);

  pieceLT.stickers.forEach(s => (s.vecs = [cmd("LUB").unit(), cmd("LUF").unit()]));

  for (let i = 0; i < 4; i += 1) {
    pieces.push(pieceLT.rotate(CENTER, UP, PI_2 * i));
    pieces.push(pieceLT.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI));
    pieces.push(pieceLT.rotate(ref, ref, (-2 * PI) / 3).rotate(CENTER, UP, PI_2 * i));
  }

  dino.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  dino.scramble = function () {
    if (!dino.toMove) return;

    const MOVES = 20;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = dino.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(2);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  dino.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  dino.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(dino, dino.faceColors);

  return dino;
}
