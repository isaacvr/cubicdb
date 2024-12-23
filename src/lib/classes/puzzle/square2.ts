import { Piece } from "./Piece";
import { RIGHT, LEFT, BACK, UP, FRONT, DOWN } from "./../vector3d";
import { Vector3D, CENTER } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

function its(a: Vector3D, b: Vector3D, axis: "x" | "y" | "z"): Vector3D {
  let ini = 0;
  let fin = 1;
  let mid: number = 0;

  for (let i = 1; i <= 50; i += 1) {
    mid = (ini + fin) / 2;
    const pt = a.add(b.sub(a).mul(mid));
    Math.abs(pt[axis]) < 1 ? (ini = mid) : (fin = mid);
  }

  return a.add(b.sub(a).mul(mid));
}

export function SQUARE2(): PuzzleInterface {
  const sq2: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["w", "b", "r", "y", "g", "o"],
    move: () => true,
    roundParams: {},
  };

  sq2.getAllStickers = getAllStickers.bind(sq2);

  const pieces = sq2.pieces;

  const L = 1;
  const L23 = (2 * L) / 3;
  const L1 = (2 * L * Math.sqrt(2)) / 2;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_6 = PI / 6;

  const BIG = (L1 * Math.sin(PI_6)) / Math.sin((7 * PI) / 12);

  const PTS: Vector3D[] = [];
  const LB = LEFT.add(BACK);
  const LF = LEFT.add(FRONT);
  const RF = RIGHT.add(FRONT);
  const RB = RIGHT.add(BACK);

  const LBU = LB.add(UP);
  const LBD = LB.add(DOWN);
  const RBU = RB.add(UP);
  const RBD = RB.add(DOWN);
  const LFU = LF.add(UP);
  const LFD = LF.add(DOWN);

  // Generate anchor points for the top layer
  for (let i = 0; i < 3; i += 1) {
    PTS.push(its(CENTER, LB.rotate(CENTER, UP, PI_6 * i), "x").add(UP));
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push(its(CENTER, LF.rotate(CENTER, UP, PI_6 * i), "z").add(UP));
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push(its(CENTER, RF.rotate(CENTER, UP, PI_6 * i), "x").add(UP));
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push(its(CENTER, RB.rotate(CENTER, UP, PI_6 * i), "z").add(UP));
  }

  for (let i = 0, maxi = PTS.length; i < maxi; i += 1) {
    const p1 = PTS[i];
    const p2 = PTS[(i + 1) % maxi];
    const pc = new Piece([
      new Sticker([CENTER.add(UP), p1, p2]),
      new Sticker([CENTER.add(UP), p1, p2]).add(DOWN.mul(2 / 3), true).reverse(true),
      new Sticker([p1, p1.add(DOWN.mul(2 / 3)), p2.add(DOWN.mul(2 / 3)), p2], "", [UP.clone()]),
      new Sticker([CENTER.add(UP), p2, p2.add(DOWN.mul(2 / 3)), CENTER.add(UP.div(3))]),
      new Sticker([CENTER.add(UP), CENTER.add(UP.div(3)), p1.add(DOWN.mul(2 / 3)), p1]),
    ]);

    pieces.push(pc);
  }

  for (let i = 0, maxi = PTS.length; i < maxi; i += 1) {
    pieces.push(pieces[i].rotate(CENTER, RIGHT, PI));
  }

  const mid = new Piece([
    new Sticker([
      LBU.add(DOWN.mul(L23)),
      LBD.add(UP.mul(L23)),
      LFD.add(UP.mul(L23)),
      LFU.add(DOWN.mul(L23)),
    ]),
    new Sticker([
      LFU.add(DOWN.mul(L23)),
      LFD.add(UP.mul(L23)),
      LFD.add(UP.mul(L23)).add(RIGHT.mul(BIG)),
      LFU.add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
    ]),
    new Sticker([
      LFU.add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
      LFD.add(UP.mul(L23)).add(RIGHT.mul(BIG)),
      RBD.add(UP.mul(L23)).add(LEFT.mul(BIG)),
      RBU.add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
    ]),
    new Sticker([
      RBU.add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
      RBD.add(UP.mul(L23)).add(LEFT.mul(BIG)),
      LBD.add(UP.mul(L23)),
      LBU.add(DOWN.mul(L23)),
    ]),
    new Sticker([
      LBU.add(DOWN.mul(L23)),
      LFU.add(DOWN.mul(L23)),
      LFU.add(DOWN.mul(L23)).add(RIGHT.mul(BIG)),
      RBU.add(DOWN.mul(L23)).add(LEFT.mul(BIG)),
    ]),
    new Sticker([
      LBD.add(UP.mul(L23)),
      LFD.add(UP.mul(L23)),
      LFD.add(UP.mul(L23)).add(RIGHT.mul(BIG)),
      RBD.add(UP.mul(L23)).add(LEFT.mul(BIG)),
    ]).reverse(),
  ]);

  const vdir = mid.stickers[2].getOrientation();

  mid.stickers.forEach(s => {
    s.vecs = [vdir.mul(-1), UP.clone()];
  });

  pieces.push(mid);
  pieces.push(mid.rotate(CENTER, UP, PI));

  const planes = [
    mid.stickers[2].clone().points, // /
    pieces[0].stickers[1].clone().points.reverse(), // up
    pieces[PTS.length].stickers[1].clone().points.reverse(), // down
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

  sq2.move = function (moves: any[]) {
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

  sq2.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const ang = sticker.vecs[0].cross(UP).abs() < EPS ? PI_6 : PI;
    let toMovePieces = [];

    if (ang > PI_6 && dir.cross(UP).abs() > EPS) {
      toMovePieces = pieces.filter(p => p.direction1(dir.mul(0.06), dir) === 0);
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

  sq2.scramble = function () {
    if (!sq2.toMove) return;

    const MOVES = 30;
    const TOP_PIECES = pieces.slice(0, 12);
    const BOTTOM_PIECES = pieces.slice(12, 24);
    const EQ = pieces[pieces.length - 1] as Piece;

    for (let i = 0; i < MOVES; i += 1) {
      const pt = random(TOP_PIECES) as Piece;
      const pb = random(BOTTOM_PIECES) as Piece;

      const s1 = random(
        pt.stickers.filter(
          s => !/^[xd]{1}$/.test(s.color) && s.getOrientation().cross(UP).abs() > EPS
        )
      );
      const s2 = random(
        pb.stickers.filter(
          s => !/^[xd]{1}$/.test(s.color) && s.getOrientation().cross(UP).abs() > EPS
        )
      );

      const pcs1 = sq2.toMove(pt, s1, UP) as ToMoveResult;
      const pcs2 = sq2.toMove(pb, s2, DOWN) as ToMoveResult;

      const cant1 = random(12);
      const cant2 = random(12);

      pcs1.pieces.forEach((p: Piece) => p.rotate(CENTER, UP, pcs1.ang * cant1, true));
      pcs2.pieces.forEach((p: Piece) => p.rotate(CENTER, DOWN, pcs2.ang * cant2, true));

      const pcs3 = sq2.toMove(EQ, EQ.stickers[0], EQ.stickers[0].vecs[0]) as ToMoveResult;
      pcs3.pieces.forEach((p: Piece) => p.rotate(CENTER, EQ.stickers[0].vecs[0], pcs3.ang, true));
    }
  };

  sq2.rotation = {
    x: PI_6,
    y: -PI_6,
    z: 0,
  };

  sq2.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(sq2, sq2.faceColors);

  return sq2;
}
