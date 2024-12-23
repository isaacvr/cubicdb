import { UP, BACK, FRONT, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function ULTIMATE_SKEWB(): PuzzleInterface {
  const uSkewb: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [
      "white",
      "yellow",
      "violet",
      "green",
      "red",
      "blue",
      "orange",
      "lblue",
      "lyellow",
      "pink",
      "lgreen",
      "gray",
    ],
    move: () => true,
    roundParams: {},
  };

  const PI = Math.PI;
  const sq = Math.sqrt;
  const F_INT = sq((50 + 22 * sq(5)) / 5) / 4;
  const F_EXT = (sq(6) / 4) * sq(3 + sq(5));
  const R_INT = 1;
  const SIDE = R_INT / F_INT;
  const R_EXT = SIDE * F_EXT;
  const RAD = sq(R_EXT ** 2 - R_INT ** 2);
  const INNER_ANG = (2 * PI) / 5;
  const ANG = (2 * PI) / 3;

  const anchors: Vector3D[] = [];

  for (let i = 0; i < 5; i += 1) {
    anchors.push(UP.mul(R_INT).add(BACK.mul(RAD).rotate(CENTER, UP, i * INNER_ANG)));
  }

  uSkewb.getAllStickers = getAllStickers.bind(uSkewb);

  const mid = (a: number, b: number) => anchors[a].add(anchors[b]).div(2);

  const u1 = Vector3D.cross(CENTER, mid(0, 4), mid(2, 3));
  const u2 = Vector3D.cross(CENTER, mid(0, 1), mid(4, 3));
  const pieces = uSkewb.pieces;
  const vdir = [
    Vector3D.cross(CENTER, mid(2, 3), mid(0, 4)),
    Vector3D.cross(CENTER, mid(3, 4), mid(0, 1)),
    Vector3D.cross(
      CENTER,
      mid(0, 4).reflect(CENTER, mid(1, 1), mid(2, 2)),
      mid(2, 3).reflect(CENTER, mid(1, 1), mid(2, 2))
    ),
  ];

  const centerPoint = mid(3, 4).add(mid(4, 0)).sub(anchors[4]);
  const bigSticker = new Sticker(
    [mid(0, 1), anchors[1], anchors[2], mid(2, 3), centerPoint],
    "",
    vdir
  );
  const midSticker = new Sticker([anchors[0], mid(0, 1), centerPoint, mid(0, 4)], "", [
    vdir[0],
    vdir[1].mul(-1),
    vdir[2].reflect(CENTER, anchors[4], mid(1, 2)),
  ]);

  const bigPiece = new Piece([bigSticker, bigSticker.rotate(CENTER, mid(1, 2), PI)]);

  const bst = bigPiece.stickers;

  const smallSticker = new Sticker(
    [
      bst[0].points[0],
      bst[0].points[0].add(bst[1].points[3]).sub(bst[0].points[1]),
      bst[1].points[3],
      bst[0].points[1],
    ],
    "",
    vdir
  );

  bigPiece.stickers.push(
    smallSticker,
    smallSticker.reflect1(CENTER, anchors[2].sub(anchors[1]), true)
  );
  bst.forEach(s => (s.vecs = vdir.map(v => v.clone())));

  const bigRPiece = bigPiece
    .rotate(CENTER, bigPiece.stickers[1].getOrientation(), INNER_ANG)
    .rotate(CENTER, UP, INNER_ANG * 3);

  const rmidSticker = midSticker.reflect(CENTER, anchors[3], anchors[4], true);
  const smallPiece = new Piece([
    midSticker,
    midSticker.rotate(CENTER, anchors[0], (-2 * PI) / 3),
    rmidSticker
      .rotate(CENTER, rmidSticker.getOrientation(), INNER_ANG * 2)
      .reflect(CENTER, centerPoint, anchors[4], true),
  ]);
  const smallRPiece = smallPiece.reflect1(CENTER, anchors[2].sub(anchors[1]), true);

  pieces.push(
    ...[0, 1, 2].map(n => bigPiece.rotate(CENTER, u1, ANG * n)),
    ...[0, 1, 2].map(n => bigRPiece.rotate(CENTER, u1, ANG * n)),

    ...[0, 1, 2].map(n => smallPiece.rotate(CENTER, u1, ANG * n)),
    ...[0, 1, 2].map(n => smallRPiece.rotate(CENTER, u1, ANG * n)),

    smallPiece.rotate(CENTER, u2, ANG),
    smallRPiece.rotate(CENTER, u2, -ANG)
  );

  uSkewb.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = piece.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir, true) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  uSkewb.scramble = function () {
    if (!uSkewb.toMove) return;

    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = uSkewb.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  uSkewb.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  uSkewb.faceVectors = [
    bigPiece.stickers[0].getOrientation(),
    ...[0, 1, 2, 3, 4].map(n =>
      bigPiece.stickers[1].rotate(CENTER, UP, INNER_ANG * n).getOrientation()
    ),
  ];

  uSkewb.faceVectors.push(
    ...uSkewb.faceVectors.map(v => v.rotate(CENTER, FRONT, PI).rotate(CENTER, UP, INNER_ANG / 2))
  );

  assignColors(uSkewb, uSkewb.faceColors);

  return uSkewb;
}
