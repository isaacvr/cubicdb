import { Vector3D, UP, DOWN, FRONT, CENTER, RIGHT, LEFT } from "../vector3d";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { ScrambleParser } from "@classes/scramble-parser";

export function FTO(): PuzzleInterface {
  let fto: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["w", "v", "g", "r", "y", "gray", "b", "o"],
    move: () => true,
    dims: [],
    roundParams: [],
  };

  fto.getAllStickers = getAllStickers.bind(fto);

  fto.pieces = [];
  let pieces = fto.pieces;

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_4 = PI / 4;
  const len = Math.SQRT2 / 3;

  let cornerSticker = new Sticker([
    FRONT,
    FRONT.add(RIGHT.sub(FRONT).mul(1 / 3)),
    FRONT.add(UP.sub(FRONT).mul(1 / 3)),
  ]);
  let cornerPiece = new Piece([0, 1, 2, 3].map(n => cornerSticker.rotate(CENTER, FRONT, n * PI_2)));

  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, RIGHT, n * PI_2)));
  pieces.push(...[1, -1].map(n => cornerPiece.rotate(CENTER, UP, n * PI_2)));

  let edgeBigSticker = cornerSticker.add(RIGHT.sub(FRONT).mul(1 / 3));
  let edgeBigPiece = new Piece([edgeBigSticker, edgeBigSticker.reflect1(FRONT, UP, true)]);

  pieces.push(...[0, 1, 2, 3].map(n => edgeBigPiece.rotate(CENTER, UP, n * PI_2)));
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgeBigPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, n * PI_2))
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgeBigPiece.rotate(CENTER, FRONT, -PI_2).rotate(CENTER, UP, n * PI_2))
  );

  let edgeSticker = cornerSticker.rotate(
    cornerSticker.points[2],
    cornerSticker.getOrientation(),
    PI / 3
  );

  let edgePiece = new Piece([
    edgeSticker,
    cornerPiece.reflect1(cornerSticker.points[1], FRONT, true).stickers[0],
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2)));
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2).rotate(CENTER, RIGHT, PI_2))
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2).rotate(CENTER, RIGHT, -PI_2))
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2).rotate(CENTER, RIGHT, PI))
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2).rotate(CENTER, UP, PI_2))
  );

  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, FRONT, n * PI_2).rotate(CENTER, UP, -PI_2))
  );

  pieces.forEach(
    pc =>
      pc
        .rotate(CENTER, FRONT, PI_4, true)
        .rotate(CENTER, LEFT, Math.asin(0.5773502691896258), true) // sin(ang)
        .div(0.816496580927726, true) // box length
  );

  let getPlaneFromSticker = (st: Sticker, layer = 1) => {
    let o = st.getOrientation();
    return st.points.map(p => p.add(o.mul(-len * layer)));
  };

  let planes: Vector3D[][] = [
    [...getPlaneFromSticker(pieces[0].stickers[0]).reverse()], // U
    [...getPlaneFromSticker(pieces[0].stickers[3]).reverse()], // R
    [...getPlaneFromSticker(pieces[0].stickers[2]).reverse()], // F
    [...getPlaneFromSticker(pieces[0].stickers[0], 2)], // D
    [...getPlaneFromSticker(pieces[0].stickers[1]).reverse()], // L
    [...getPlaneFromSticker(pieces[0].stickers[2], 2)], // B
    [...getPlaneFromSticker(pieces[0].stickers[1], 2)], // BR
    [...getPlaneFromSticker(pieces[0].stickers[3], 2)], // BL
  ];

  let trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    let moveId = mv[0];
    let turns = mv[1];
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const mu = u.mul(-1);
    const ang = ((2 * Math.PI) / 3) * turns;

    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(pts1[0], u, false, (s: Sticker) => !/^[xd]$/.test(s.color));

      if (d < 0) {
        pcs.push(pieces[i]);
      }
    }

    return {
      pieces: pcs,
      u: mu,
      ang,
    };
  };

  /// [ id, turns, layers, direction ]
  fto.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let pcs = trySingleMove(mv);
      if (!pcs) {
        return false;
      }
      let { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }
    return true;
  };

  fto.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: (2 * PI) / 3,
    };
  };

  fto.scramble = function () {
    if (!fto.toMove) return;
    // const MOVES = n >= 2 ? (n - 2) * 20 + 10 : 0;
    for (let i = 0; i < 50; i += 1) {
      let p = random(pieces) as Piece;
      let s = random(p.stickers.filter(s => /^[^xd]$/.test(s.color))) as Sticker;
      if (!s) {
        i -= 1;
        continue;
      }
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = fto.toMove(p, s, vec) as ToMoveResult;
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang, true));
    }
  };

  fto.applySequence = function (seq: string[]) {
    let moves = seq.map(mv => ScrambleParser.parseMegaminx(mv)[0]);
    let res: { u: Vector3D; ang: number; pieces: string[] }[] = [];

    // for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
    //   let pcs;

    //   try {
    //     pcs = trySingleMove(moves[i]);
    //   } catch (e) {
    //     console.log("ERROR: ", seq[i], moves[i], e);
    //   }

    //   if (!pcs) {
    //     continue;
    //   }

    //   let { u, ang } = pcs;

    //   res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

    //   pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    // }

    return res;
  };

  const commonVecs = pieces[0].stickers.map(st => st.getOrientation());

  fto.faceVectors = [...commonVecs, ...commonVecs.map(v => v.mul(-1))].map(v => v.clone());

  pieces.forEach(pcs => pcs.stickers.forEach(st => (st.vecs = commonVecs.map(v => v.clone()))));

  assignColors(fto, fto.faceColors);

  // Initial rotation
  fto.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  return fto;
}
