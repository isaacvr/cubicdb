import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "@classes/vector3d";
import { Vector3D } from "@classes/vector3d";
import type { PiecesToMove, PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { ScrambleParser } from "@classes/scramble-parser";

export function RUBIK(_a: number, _b: number, _c: number): PuzzleInterface {
  // const dims = [_a, _b, _c].sort();
  const dims = [_a, _b, _c];
  const a = dims[0],
    b = dims[1],
    c = dims[2];
  const isCube = a == b && b == c;
  const len = dims.reduce((m, e) => Math.min(m, 2 / e), 2);

  const rubik: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims,
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: { ppc: a < 10 ? 10 : a < 20 ? 5 : 2 },
  };

  let fc = rubik.faceColors;

  rubik.getAllStickers = getAllStickers.bind(rubik);

  const ref = LEFT.mul(a)
    .add(BACK.mul(b))
    .add(UP.mul(c))
    .mul(len / 2);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [RIGHT, FRONT, UP];
  const turns: { 0: Vector3D; 1: number }[] = [
    [UP, PI_2 * (1 + (a === 1 ? 1 : (a ^ b) & 1))],
    [FRONT, PI_2 * (1 + (a === 1 ? 1 : (a ^ c) & 1))],
    [RIGHT, PI_2 * (1 + (a === 1 ? 1 : (b ^ c) & 1))],
  ];

  let pieces = rubik.pieces;

  for (let z = 0; z < c; z += 1) {
    for (let y = 0; y < b; y += 1) {
      for (let x = 0; x < a; x += 1) {
        if (z > 0 && z < c - 1 && y > 0 && y < b - 1 && x > 0 && x < a - 1) continue;

        let anchor = ref.add(DOWN.mul(z).add(FRONT.mul(y)).add(RIGHT.mul(x)).mul(len));
        let center = anchor.add(
          FRONT.add(RIGHT)
            .add(DOWN)
            .mul(len / 2)
        );
        let p = new Piece();
        let sUp = new Sticker(
          [
            anchor,
            anchor.add(FRONT.mul(len)),
            anchor.add(FRONT.add(RIGHT).mul(len)),
            anchor.add(RIGHT.mul(len)),
          ],
          fc[0]
        );
        let sLeft = new Sticker(
          [
            anchor,
            anchor.add(DOWN.mul(len)),
            anchor.add(DOWN.add(FRONT).mul(len)),
            anchor.add(FRONT.mul(len)),
          ],
          fc[4]
        );
        sUp.vecs = vdir.map(e => e.clone());
        sLeft.vecs = vdir.map(e => e.clone());
        (!isCube || z == 0) && p.stickers.push(sUp);
        (!isCube || x == a - 1) && p.stickers.push(sLeft.rotate(center, UP, PI));
        (!isCube || y == b - 1) && p.stickers.push(sLeft.rotate(center, UP, PI_2));
        (!isCube || z == c - 1) && p.stickers.push(sUp.rotate(center, RIGHT, PI));
        (!isCube || x == 0) && p.stickers.push(sLeft);
        (!isCube || y == 0) && p.stickers.push(sLeft.rotate(center, UP, -PI_2));

        if (p.stickers.length) {
          if (p.stickers.length === 1 && isCube) {
            if ((z == 0 || z == c - 1) && c > 1) {
              p.stickers.push(p.stickers[0].rotate(center, RIGHT, PI));
            } else if ((x == 0 || x == a - 1) && a > 1) {
              p.stickers.push(p.stickers[0].rotate(center, UP, PI));
            } else if ((y == 0 || y == b - 1) && b > 1) {
              p.stickers.push(p.stickers[0].rotate(center, UP, PI));
            }
          }
          p.updateMassCenter();
          pieces.push(p);
        }
      }
    }
  }

  const MOVE_MAP = "URFDLB";

  let ref1 = ref
    .add(RIGHT.mul(a * len))
    .add(FRONT.mul(b * len))
    .add(DOWN.mul(c * len));

  let planes = [
    [ref, ref.add(FRONT), ref.add(RIGHT)],
    [ref1, ref1.add(BACK), ref1.add(UP)],
    [ref1, ref1.add(UP), ref1.add(LEFT)],
    [ref1, ref1.add(LEFT), ref1.add(BACK)],
    [ref, ref.add(DOWN), ref.add(FRONT)],
    [ref, ref.add(RIGHT), ref.add(DOWN)],
  ];

  let trySingleMove = (mv: any): PiecesToMove | null => {
    let moveId = MOVE_MAP.indexOf(mv[1]);
    let layers = mv[0];
    let turns = mv[2];
    let span = mv[3];
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const mu = u.mul(-1);

    // Check if the move involves the whole cube
    [
      [a, RIGHT],
      [b, FRONT],
      [c, UP],
    ].forEach((e: any) => {
      if (Math.abs(u.dot(e[1])) > EPS) {
        layers = layers === e[0] ? e[0] + 1 : layers;
      }
    });

    const pts2 = pts1.map(p => p.add(mu.mul(len * layers)));
    const pts3 = pts2.map(p => p.add(u.mul(len * span)));
    const ang = (Math.PI / 2) * turns;

    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(pts2[0], u, true);

      if (d === 0) {
        console.log("Invalid move. Piece intersection detected.", "URFDLB"[moveId], turns, mv);
        console.log("Piece: ", i, pieces[i], pts2);
        return null;
      }

      if (span) {
        let d1 = pieces[i].direction1(pts3[0], u, true);

        if (d * d1 < 0) {
          pcs.push(pieces[i]);
        }
      } else if (d > 0) {
        pcs.push(pieces[i]);
      }
    }

    return {
      pieces: pcs,
      u: mu,
      ang,
    };
  };

  rubik.move = function (moves: any[]) {
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

  rubik.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    let tn = turns.map(e => [e[0].cross(dir).abs2(), e[1]]).sort((a, b) => a[0] - b[0]);
    return {
      pieces: toMovePieces,
      ang: tn[0][1],
    };
  };

  rubik.scramble = function () {
    if (!rubik.toMove) return;

    const MOVES = a >= 2 ? (a - 2) * 30 + 10 : 0;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random(pieces) as Piece;
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = rubik.toMove(p, s, vec) as ToMoveResult;
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  rubik.applySequence = function (seq: string[]) {
    let moves = seq.map(mv => ScrambleParser.parseNNN(mv, { a, b, c })[0]);
    let res: { u: Vector3D; ang: number; pieces: string[] }[] = [];

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

      let { u, ang } = pcs;

      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return res;
  };

  rubik.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  rubik.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(rubik, rubik.faceColors, isCube);

  return rubik;
}
