import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

function getAngle(a: Vector3D, b: Vector3D): number {
  return Math.acos(a.unit().dot(b.unit()));
}

export function REX(): PuzzleInterface {
  const rex: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => true,
    roundParams: {},
  };

  rex.getAllStickers = getAllStickers.bind(rex);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG = (2 * PI) / 3;
  const RAD = Math.sqrt(5);
  const R1 = Math.sqrt((RAD - 1) ** 2 + (-RAD - 1) ** 2);
  const H = Math.sqrt(R1 ** 2 - RAD ** 2);

  const pieces = rex.pieces;

  const _ref1 = LEFT.add(BACK).add(UP);
  const _ref2 = LEFT.add(FRONT).add(UP);
  const _ref3 = RIGHT.add(BACK).add(UP);
  const _ref4 = RIGHT.add(FRONT).add(UP);

  const ref1 = UP.add(RIGHT.add(FRONT).mul(RAD));
  const ref2 = UP.add(RIGHT.add(BACK).mul(RAD));

  const A = new Vector3D(RAD - H, 1, 0);
  const B = A.rotate(CENTER, DOWN, PI_2);

  const SWAP_ANG1 = getAngle(A.sub(ref1), _ref2.sub(ref1));
  const SWAP_ANG2 = getAngle(B.sub(ref1), A.sub(ref1));

  const curve1: Vector3D[] = [];
  const curve2: Vector3D[] = [];
  const curve3: Vector3D[] = [];
  let curve1_inv: Vector3D[] = [];
  let curve2_inv: Vector3D[] = [];
  let curve3_inv: Vector3D[] = [];

  const PTS1 = 10;
  const PTS2 = 10;

  for (let i = 0; i <= PTS1; i += 1) {
    const alpha = i / PTS1;
    curve1.push(_ref2.rotate(ref1, DOWN, alpha * SWAP_ANG1));
  }

  for (let i = 0; i <= PTS1; i += 1) {
    const alpha = i / PTS1;
    curve2.push(_ref1.rotate(ref2, UP, alpha * SWAP_ANG1));
  }

  for (let i = 0; i <= PTS2; i += 1) {
    const alpha = i / PTS2;
    curve3.push(B.rotate(ref1, UP, alpha * SWAP_ANG2));
  }

  curve1_inv = curve1.map(e => e.clone()).reverse();
  curve2_inv = curve2.map(e => e.clone()).reverse();
  curve3_inv = curve3.map(e => e.clone()).reverse();

  const sticker1 = new Sticker([LEFT.add(UP), _ref2, ...curve1, ...curve2_inv, _ref1]);
  const sticker2 = new Sticker([
    ...curve2,
    ...curve3_inv,
    ...curve1_inv.map(e => e.rotate(CENTER, DOWN, PI_2)),
  ]);
  const sticker3 = new Sticker(
    [0, 1, 2, 3].reduce((ac: Vector3D[], i) => {
      ac.push(...curve3.map(p => p.rotate(CENTER, UP, i * PI_2)));
      return ac;
    }, [])
  );

  const piece1 = new Piece([sticker1, sticker1.rotate(_ref1, BACK, PI_2).reverse()]);
  const piece2 = new Piece([sticker2]);
  const piece3 = new Piece([sticker3]);

  piece1.stickers.forEach(s => (s.vecs = [_ref1.unit(), _ref2.unit()]));
  piece2.stickers.forEach(
    s => (s.vecs = [_ref1.unit(), _ref2.unit(), RIGHT.add(BACK).add(UP).unit()])
  );
  piece3.stickers.forEach(s => (s.vecs = [_ref1.unit(), _ref2.unit(), _ref3.unit(), _ref4.unit()]));

  const groupSmall = [0, 1, 2, 3].reduce((ac: Piece[], i) => {
    ac.push(piece2.rotate(CENTER, UP, PI_2 * i));
    ac.push(piece2.rotate(_ref1, _ref1, (-2 * PI) / 3).rotate(CENTER, UP, PI_2 * i));
    ac.push(piece2.rotate(_ref1, _ref1, (2 * PI) / 3).rotate(CENTER, UP, PI_2 * i));
    return ac;
  }, []);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(piece1.rotate(CENTER, UP, PI_2 * i));
    pieces.push(piece1.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI));
    pieces.push(piece1.rotate(_ref1, _ref1, (-2 * PI) / 3).rotate(CENTER, UP, PI_2 * i));

    pieces.push(piece3.rotate(CENTER, FRONT, PI_2 * i));
  }

  pieces.push(...groupSmall);
  pieces.push(...groupSmall.map(e => e.rotate(CENTER, FRONT, PI)));

  pieces.push(piece3.rotate(CENTER, RIGHT, PI_2), piece3.rotate(CENTER, LEFT, PI_2));

  rex.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const c = new Vector3D(Math.sign(dir.x), Math.sign(dir.y), Math.sign(dir.z)).mul(0.2);
    const toMovePieces = pieces.filter(p => p.direction1(c, dir, true) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  rex.scramble = function () {
    if (!rex.toMove) return;

    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = rex.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(2);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  rex.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  rex.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(rex, rex.faceColors);

  return rex;
}
