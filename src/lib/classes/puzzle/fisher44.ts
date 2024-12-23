import { Piece } from "./Piece";
import { LEFT, UP, BACK, FRONT, RIGHT, CENTER, DOWN } from "../vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Vector3D } from "../vector3d";
import { Sticker } from "./Sticker";
import { assignColors, extrudeSticker, getAllStickers, random } from "./puzzleUtils";
import { cmd } from "@helpers/math";

export function FISHER44(): PuzzleInterface {
  const fisher: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    getAllStickers: () => [],
    faceColors: ["y", "o", "g", "w", "r", "b"],
    move: () => true,
    roundParams: {},
  };

  fisher.getAllStickers = getAllStickers.bind(fisher);
  const pieces = fisher.pieces;

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_4 = PI / 4;
  const CENTER_LEN = 1 / 2;
  const CENTER_DIAG = Math.SQRT2 * CENTER_LEN;

  // Top center
  const centerSticker = new Sticker(
    [cmd("U"), cmd("U", "R", CENTER_LEN), cmd("U", "RB", CENTER_LEN), cmd("U", "B", CENTER_LEN)],
    "",
    [UP, RIGHT, BACK]
  ).rotate(CENTER, UP, PI_4, true);

  const centerPiece = new Piece([
    centerSticker,
    extrudeSticker(centerSticker, DOWN.mul(CENTER_LEN), false, false),
    centerSticker.add(DOWN.mul(CENTER_LEN)).reverse(),
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => centerPiece.rotate(CENTER, UP, PI_2 * n)));

  // Top Edge
  const edgeSticker = new Sticker(
    [cmd("URB", "L", CENTER_DIAG), centerSticker.points[2], centerSticker.points[1], cmd("URB")],
    "",
    [UP, cmd("RB"), cmd("LB")]
  );

  const edgeSticker1 = new Sticker(
    [
      cmd("URB"),
      cmd("URB", "D", CENTER_LEN),
      cmd("URB", "L", CENTER_DIAG).add(DOWN.mul(CENTER_LEN)),
      cmd("URB", "L", CENTER_DIAG),
    ],
    "",
    [UP, cmd("RB"), cmd("LB")]
  );

  const edgePiece = new Piece([
    edgeSticker,
    extrudeSticker(edgeSticker, DOWN.mul(CENTER_LEN), false, false, false),
    edgeSticker1,
    edgeSticker.add(DOWN.mul(CENTER_LEN)).reverse(),
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      edgePiece.reflect1(CENTER, new Vector3D(1, 0, 1), true).rotate(CENTER, UP, PI_2 * n)
    )
  );

  // Corner
  const cornerSticker = new Sticker(
    [cmd("ULB", "R", CENTER_DIAG), centerSticker.points[2], cmd("URB", "L", CENTER_DIAG)],
    "",
    [UP, cmd("RB"), cmd("LB")]
  );

  const cornerPiece = new Piece([
    cornerSticker,
    extrudeSticker(cornerSticker, DOWN.mul(CENTER_LEN), false, false, false),
    cornerSticker.add(DOWN.mul(CENTER_LEN)).reverse(),
    new Sticker(
      [
        cornerSticker.points[0],
        cornerSticker.points[2],
        cornerSticker.points[2].add(DOWN.mul(CENTER_LEN)),
        cornerSticker.points[0].add(DOWN.mul(CENTER_LEN)),
      ],
      "",
      [UP, cmd("RB"), cmd("LB")]
    ),
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n)));

  const piecesLen = pieces.length;

  for (let i = 1; i <= 2; i += 1) {
    for (let j = 4; j < piecesLen; j += 1) {
      pieces.push(pieces[j].add(DOWN.mul(CENTER_LEN * i)));
    }
  }

  for (let i = 0; i < piecesLen; i += 1) {
    pieces.push(pieces[i].add(DOWN.mul(CENTER_LEN * 3)));
  }

  pieces.forEach(pc => pc.updateMassCenter());

  // Interaction
  fisher.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = piece.getMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: PI_2,
    };
  };

  fisher.scramble = function () {
    if (!fisher.toMove) return;

    const MOVES = 40;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = fisher.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  fisher.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  fisher.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(fisher, fisher.faceColors);

  return fisher;
}
