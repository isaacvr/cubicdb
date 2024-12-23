import { Piece } from "./Piece";
import { RIGHT, LEFT, BACK, UP, FRONT, DOWN } from "./../vector3d";
import { Vector3D, CENTER } from "../../classes/vector3d";
import type { PuzzleInterface } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers } from "./puzzleUtils";
import { square1SolverGetRandomScramble } from "@cstimer/scramble/scramble_sq1";
import { ScrambleParser } from "@classes/scramble-parser";

export function SQUARE1(): PuzzleInterface {
  const sq1: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["w", "b", "r", "y", "g", "o"],
    move: () => true,
    roundParams: {
      rd: (s: Sticker, i: number) => {
        const o = s.getOrientation();

        if (o.cross(UP).abs() < EPS) {
          if (s.points.length === 3) return i === 1 ? [0.25] : 0.11;
          return i === 2 ? [0.2] : 0.11;
        }

        if (s.name === "side-equator") {
          return [0.05, true];
        }

        if (s.name === "side-corner") {
          return i === 2 ? [0.2, true] : [0.05, true];
        }

        if (s.name === "side-edge") {
          return i === 1 || i === 2 ? [0.2, true] : [0.05, true];
        }

        return i === 1 || i === 2 ? [0.2, true] : [0.05, true];
      },
      scale: 0.95,
    },
  };

  sq1.getAllStickers = getAllStickers.bind(sq1);

  const L23 = 2 / 3;
  const L1 = Math.sqrt(2);
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_6 = PI / 6;

  const BIG = (L1 * Math.sin(PI_6)) / Math.sin((7 * PI) / 12);

  const pieces = sq1.pieces;

  const pieceBig = new Piece([
    new Sticker([
      LEFT.add(BACK).add(UP),
      LEFT.add(BACK).add(UP).add(FRONT.mul(BIG)),
      UP,
      LEFT.add(BACK).add(UP).add(RIGHT.mul(BIG)),
    ]),
    new Sticker(
      [
        LEFT.add(BACK).add(UP),
        LEFT.add(BACK).add(UP).add(DOWN.mul(L23)),
        LEFT.add(BACK).add(UP).add(DOWN.mul(L23)).add(FRONT.mul(BIG)),
        LEFT.add(BACK).add(UP).add(FRONT.mul(BIG)),
      ],
      undefined,
      [],
      false,
      "side-corner"
    ),
  ]);

  pieceBig.stickers.push(pieceBig.stickers[0].add(DOWN.mul(L23)).reverse());
  pieceBig.stickers.push(
    pieceBig.stickers[1].reflect1(
      CENTER,
      Vector3D.cross(CENTER, LEFT.add(BACK), LEFT.add(BACK).add(UP)),
      true
    )
  );

  const pieceSmall = new Piece([
    new Sticker(
      [
        RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)),
        RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)).add(DOWN.mul(L23)),
        LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)).add(DOWN.mul(L23)),
        LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)),
      ],
      undefined,
      [],
      false,
      "side-edge"
    ),
    new Sticker([
      LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)),
      UP,
      RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)),
    ]),
  ]);

  pieceBig.stickers.forEach(s => {
    s.vecs = [UP.clone()];
  });
  pieceSmall.stickers.forEach(s => {
    s.vecs = [UP.clone()];
  });

  const mid = new Piece([
    new Sticker(
      [
        LEFT.add(BACK).add(UP).add(DOWN.mul(L23)),
        LEFT.add(BACK).add(DOWN).add(UP.mul(L23)),
        LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)),
        LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)),
      ],
      undefined,
      [],
      false,
      "side-equator"
    ),
    new Sticker(
      [
        LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)),
        LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)).add(RIGHT.mul(BIG)),
        LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
        LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)),
      ],
      undefined,
      [],
      false,
      "small-equator"
    ),
    new Sticker([
      LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
      LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)).add(RIGHT.mul(BIG)),
      RIGHT.add(BACK).add(DOWN).add(UP.mul(L23)).add(LEFT.mul(BIG)),
      RIGHT.add(BACK).add(UP).add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
    ]),
    new Sticker([
      LEFT.add(BACK).add(UP).add(DOWN.mul(L23)),
      RIGHT.add(BACK).add(UP).add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
      RIGHT.add(BACK).add(DOWN).add(UP.mul(L23)).add(LEFT.mul(BIG)),
      LEFT.add(BACK).add(DOWN).add(UP.mul(L23)),
    ]),
    new Sticker([
      LEFT.add(BACK).add(UP).add(DOWN.mul(L23)),
      LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)),
      LEFT.add(FRONT).add(UP).add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
      RIGHT.add(BACK).add(UP).add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
    ]),
    new Sticker([
      LEFT.add(BACK).add(DOWN).add(UP.mul(L23)),
      LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)),
      LEFT.add(FRONT).add(DOWN).add(UP.mul(L23)).add(RIGHT.mul(BIG)),
      RIGHT.add(BACK).add(DOWN).add(UP.mul(L23)).add(LEFT.mul(BIG)),
    ]).reverse(),
  ]);

  const vdir = mid.stickers[2].getOrientation();

  mid.stickers.forEach(s => {
    s.vecs = [vdir.mul(-1), UP.clone()];
  });

  for (let i = 0; i < 4; i += 1) {
    pieces.push(pieceSmall.rotate(CENTER, UP, i * PI_2));
    pieces.push(pieceBig.rotate(CENTER, UP, i * PI_2));
  }

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    pieces.push(pieces[i].rotate(CENTER, RIGHT, PI));
  }

  pieces.push(mid);
  pieces.push(mid.rotate(CENTER, UP, PI));

  const planes = [
    mid.stickers[2].clone().points, // /
    pieceBig.stickers[2].clone().points.reverse(), // up
    mid.stickers[5].clone().points, // down
    mid.stickers[2].clone().points.map(p => p.rotate(CENTER, UP, PI_2, true)), // For simulator only /
    [CENTER, UP, FRONT].map(v => v.add(LEFT.mul(2))), // x
    [CENTER, RIGHT, FRONT].map(v => v.add(UP.mul(2))), // y
    [CENTER, RIGHT, DOWN].map(v => v.add(FRONT.mul(2))), // z
  ];

  const trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    const moveId = mv[0]; // 2
    const turns = mv[1]; // 3
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const mu = u.mul(-1);
    const ang = PI_6 * turns;

    const pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      const d = pieces[i].direction1(pts1[0], u, false, (x: Sticker) => !/[xd]/.test(x.color));

      if (d === 0) {
        console.log("Invalid move. Piece intersection detected.", "/UD"[moveId], turns, mv);
        console.log("Piece: ", i, pieces[i], pts1);
        return null;
      }

      if (d > 0) {
        pcs.push(pieces[i]);
      }
    }

    return {
      pieces: pcs,
      u: mu,
      ang,
    };
  };

  const updateReverse = (u: Vector3D, ang: number) => {
    planes[0].forEach(p => p.rotate(CENTER, u, ang, true));

    const dirs = pieces
      .slice(-2)
      .map((p: Piece) => p.stickers.find(s => s.name === "side-equator")!.getOrientation());
    const dirs1 = pieces
      .slice(-2)
      .map((p: Piece) => p.stickers.find(s => s.name === "small-equator")!.getOrientation());
    const id = dirs[0].dot(LEFT) > 0 ? 0 : 1;
    const pu = Vector3D.cross(planes[0][0], planes[0][1], planes[0][2]);

    if (dirs1[id].dot(FRONT) * pu.dot(RIGHT) < 0) {
      planes[0].reverse();
    }
  };

  sq1.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      const { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));

      if (mv[0] > 3) {
        updateReverse(u, ang);
      }
    }
    return true;
  };

  sq1.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const ang = dir.cross(UP).abs() < EPS ? (sticker.vecs.length > 1 ? PI / 2 : PI_6) : PI;
    let toMovePieces: Piece[] = [];

    if (ang > PI_6 && dir.cross(UP).abs() > EPS) {
      if (sq1.move([[0, 6]])) {
        sq1.move([[0, 6]]);
        toMovePieces = pieces.filter(p => p.direction1(dir.mul(0.06), dir) === 0);
      } else if (sq1.move([[3, 6]])) {
        sq1.move([[3, 6]]);
        toMovePieces = pieces.filter(p => p.direction1(dir.mul(0.06), dir) === 0);
      }
    } else {
      const mc = sticker.updateMassCenter();
      const isBig = ang > PI_6;
      toMovePieces = pieces.filter(p => {
        return isBig ? p.direction1(mc, dir) === 0 : p.direction1(mc, dir) >= 0;
      });
    }

    return {
      pieces: toMovePieces,
      ang,
    };
  };

  sq1.scramble = function () {
    const scramble = ScrambleParser.parseSquare1(square1SolverGetRandomScramble());
    sq1.move(scramble);
  };

  sq1.applySequence = function (seq: string[]) {
    const moves = seq.reduce(
      (acc: number[][], mv) => [...acc, ...ScrambleParser.parseSquare1(mv)],
      []
    );
    const res: { u: Vector3D; ang: number; pieces: string[] }[] = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let pcs;
      const mv = moves[i];

      try {
        pcs = trySingleMove(mv);
      } catch (e) {
        console.log("ERROR: ", seq[i], mv, e);
      }

      if (!pcs) {
        continue;
      }

      const { u, ang } = pcs;

      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));

      if (mv[0] > 3) {
        updateReverse(u, ang);
      }
    }

    return res;
  };

  sq1.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  sq1.rotation = {
    x: PI_6,
    y: -PI_6,
    z: 0,
  };

  assignColors(sq1, sq1.faceColors);

  return sq1;
}
