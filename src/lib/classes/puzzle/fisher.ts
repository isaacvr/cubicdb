import { Piece } from "./Piece";
import { LEFT, UP, BACK, FRONT, RIGHT, CENTER, DOWN } from "../vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Vector3D } from "../vector3d";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function FISHER(): PuzzleInterface {
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

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const R2 = Math.sqrt(2);
  const R2_2 = R2 / 2;

  const L = 1;
  const L23 = (L * 2) / 3;
  const L1 = (L * R2) / 3;
  const LB = (L - L1) * 2;

  const A = LEFT.add(UP).add(BACK).mul(L);
  const B = LEFT.add(UP).add(FRONT).mul(L);
  const C = RIGHT.add(UP).add(BACK).mul(L);
  const AB = B.sub(A).unit();
  const AC = C.sub(A).unit();
  const VL = AB.mul(LB * R2_2).rotate(CENTER, UP, PI / 4);

  const piece1 = new Piece([
    new Sticker([
      A.clone(),
      A.add(AB.mul(L1)),
      A.add(AB.mul(L1)).add(VL),
      A.add(AC.mul(L1)).add(VL),
      A.add(AC.mul(L1)),
    ]),
    new Sticker([
      A.clone(),
      A.add(DOWN.mul(L23)),
      A.add(DOWN.mul(L23)).add(FRONT.mul(L1)),
      A.add(FRONT.mul(L1)),
    ]),
    new Sticker([
      A.add(FRONT.mul(L1)),
      A.add(FRONT.mul(L1)).add(DOWN.mul(L23)),
      A.add(FRONT.mul(L1)).add(DOWN.mul(L23)).add(VL),
      A.add(FRONT.mul(L1)).add(VL),
    ]),
  ]);

  piece1.stickers.push(piece1.stickers[0].add(DOWN.mul(L23)).reverse());
  piece1.stickers.push(piece1.stickers[1].rotate(A, UP, -PI_2).add(RIGHT.mul(L1)));
  piece1.stickers.push(piece1.stickers[2].add(RIGHT.sub(FRONT).mul(L1)).reverse());

  const piece2 = new Piece([
    new Sticker([A.add(AC.mul(L1)), A.add(AC.mul(L1)).add(VL), C.sub(AC.mul(L1))]),
    piece1.stickers[2].add(RIGHT.sub(FRONT).mul(L1)),
    piece1.stickers[2].rotate(A.add(FRONT.mul(L1)), UP, PI_2).add(RIGHT.sub(FRONT).mul(L1).add(VL)),
    new Sticker([
      A.add(RIGHT.mul(L1)),
      A.add(RIGHT.mul(L1 + LB)),
      A.add(RIGHT.mul(L1 + LB)).add(DOWN.mul(L23)),
      A.add(RIGHT.mul(L1)).add(DOWN.mul(L23)),
    ]),
  ]);

  piece2.stickers.push(piece2.stickers[0].add(DOWN.mul(L23)));

  const upFace = [piece2, piece1];

  for (let i = 1; i <= 3; i += 1) {
    upFace.push(upFace[0].rotate(CENTER, UP, i * PI_2));
    upFace.push(upFace[1].rotate(CENTER, UP, i * PI_2));
  }

  const centerSticker = new Sticker(
    [0, 1, 2, 3].map(e => upFace[e * 2 + 1].stickers[0].points[2].clone())
  );

  upFace.push(new Piece([centerSticker, centerSticker.rotate(UP.mul(2 / 3), RIGHT, PI)]));

  const midFace = upFace.map(p => p.add(DOWN.mul(L23)));
  const downFace = upFace.map(p => p.rotate(CENTER, RIGHT, PI));

  midFace.pop();

  const pieces = fisher.pieces;

  pieces.push(...upFace);
  pieces.push(...midFace);
  pieces.push(...downFace);

  // Adding move vectors and updating mass center
  pieces.forEach(p => {
    p.updateMassCenter();
    p.stickers.forEach(s => {
      s.vecs = [RIGHT, FRONT, UP].map(e => e.rotate(CENTER, UP, PI / 4));
    });
  });

  // fisher.moves = {
  //   "U": { plane: upFace[1].stickers[3].points.map(e => e.clone()), angle: -90 },
  //   "R": { plane: upFace[3].stickers[2].points.map(e => e.clone()), angle: -90 },
  //   "F": { plane: upFace[1].stickers[2].points.map(e => e.clone()), angle: -90 },
  //   "D": { plane: downFace[1].stickers[3].points.map(e => e.clone()), angle: -90 },
  //   "L": { plane: upFace[0].stickers[2].points.map(e => e.clone()).reverse(), angle: -90 },
  //   "B": { plane: upFace[5].stickers[2].points.map(e => e.clone()), angle: -90 },
  // };

  fisher.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = piece.updateMassCenter();
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
