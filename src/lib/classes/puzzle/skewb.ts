import { RIGHT, LEFT, DOWN, FRONT } from "./../vector3d";
import { Vector3D, CENTER, BACK, UP } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { ScrambleParser } from "@classes/scramble-parser";

export function SKEWB(): PuzzleInterface {
  const skewb: PuzzleInterface = {
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

  skewb.getAllStickers = getAllStickers.bind(skewb);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_3 = PI / 3;

  const center = new Piece([
    new Sticker([UP.add(BACK), UP.add(LEFT), UP.add(FRONT), UP.add(RIGHT)]),
  ]);

  center.stickers[0].vecs = [
    UP.add(BACK).add(LEFT).unit(),
    UP.add(BACK).add(RIGHT).unit(),
    UP.add(FRONT).add(LEFT).unit(),
    UP.add(FRONT).add(RIGHT).unit(),
  ];

  const cornerSticker = new Sticker([UP.add(RIGHT), UP.add(FRONT), UP.add(FRONT).add(RIGHT)]);

  const anchor = UP.add(FRONT).add(RIGHT);

  const corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(anchor, UP, PI_2).rotate(anchor, RIGHT, PI_2),
    cornerSticker.rotate(anchor, DOWN, PI_2).rotate(anchor, BACK, PI_2),
  ]);

  corner.stickers.forEach(s => {
    s.vecs = [
      UP.add(RIGHT).add(BACK).unit(),
      DOWN.add(RIGHT).add(FRONT).unit(),
      UP.add(LEFT).add(FRONT).unit(),
    ];
  });

  for (let i = 0; i < 4; i += 1) {
    skewb.pieces.push(center.rotate(CENTER, RIGHT, i * PI_2));
  }
  skewb.pieces.push(center.rotate(CENTER, BACK, PI_2));
  skewb.pieces.push(center.rotate(CENTER, FRONT, PI_2));

  for (let i = 0; i <= 1; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      skewb.pieces.push(corner.rotate(CENTER, RIGHT, i * PI_2).rotate(CENTER, UP, j * PI_2));
    }
  }

  const MOVE_MAP = "FURLB";

  const pieces = skewb.pieces;

  const planes = [
    [FRONT.add(LEFT), FRONT.add(UP), RIGHT.add(UP)], // F
    [RIGHT.add(UP), FRONT.add(UP), FRONT.add(LEFT)], // U
    [BACK.add(UP), RIGHT.add(FRONT), RIGHT.add(UP)], // R
    [RIGHT.add(FRONT), LEFT.add(UP), UP.add(FRONT)], // L
    [LEFT.add(UP), RIGHT.add(BACK), BACK.add(UP)], // B
    [LEFT.add(UP), BACK.add(UP), RIGHT.add(BACK)], // f
    [FRONT.add(RIGHT), FRONT.add(UP), LEFT.add(UP)], // r
    [RIGHT.add(UP), FRONT.add(RIGHT), FRONT.add(DOWN)], // l
    [RIGHT.add(UP), FRONT.add(UP), FRONT.add(LEFT)], // b

    [BACK, UP, FRONT].map(e => e.add(RIGHT.mul(2))), // x
    [RIGHT, BACK, LEFT].map(e => e.add(UP.mul(2))), // y
    [RIGHT, UP, LEFT].map(e => e.add(FRONT.mul(2))), // z
  ];

  const trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    const moveId = mv[0];
    let turns = mv[1];
    const pts1 = planes[moveId];

    if (moveId >= planes.length - 3) {
      turns = (-turns * 3) / 4;
    }

    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();

    const mu = u.mul(-1);
    const ang = -2 * PI_3 * turns;

    const pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      const d = pieces[i].direction1(pts1[0], u);
      if (d === 0) {
        console.log("Invalid move. Piece intersection detected.", MOVE_MAP[moveId], turns, mv);
        console.log("Piece: ", i, pieces[i], pts1);
        return null;
      }

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

  skewb.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      const { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return true;
  };

  skewb.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: 2 * PI_3,
    };
  };

  skewb.scramble = function () {
    if (!skewb.toMove) return;

    const MOVES = 30;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = skewb.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(2);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  skewb.applySequence = function (seq: string[]) {
    const moves = seq.map(mv => ScrambleParser.parseSkewb(mv)[0]);
    const res: { u: Vector3D; ang: number; pieces: string[] }[] = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let pcs;

      try {
        pcs = trySingleMove(moves[i]);
      } catch (e) {
        console.log("ERROR: ", seq[i], moves[i], e);
      }

      if (!pcs) {
        continue;
      }

      const { u, ang } = pcs;

      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return res;
  };

  skewb.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  skewb.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(skewb, skewb.faceColors);

  return skewb;
}
