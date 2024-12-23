import { Vector3D, UP, DOWN, FRONT, CENTER } from "../vector3d";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { ScrambleParser } from "@classes/scramble-parser";

export function PYRAMINX(n: number): PuzzleInterface {
  const pyra: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["g", "b", "y", "r"],
    move: () => true,
    dims: [],
    roundParams: {},
  };

  pyra.getAllStickers = getAllStickers.bind(pyra);

  const PI = Math.PI;
  const PI_3 = PI / 3;
  const L = 2.6;
  const V = L / Math.sqrt(3);
  const H = Math.sqrt(L ** 2 - V ** 2);
  const R = (Math.sqrt(6) * L) / 12;
  const PU = UP.mul(H - R);
  const PR = DOWN.mul(R).add(FRONT.mul(V)).rotate(CENTER, UP, PI_3);
  const PB = PR.rotate(CENTER, UP, 2 * PI_3);
  const PL = PB.rotate(CENTER, UP, 2 * PI_3);

  pyra.pieces = [];
  const pieces = pyra.pieces;

  const ANCHORS = [PU, PR, PB, PL];

  /// front, right, down, left

  const UNITS = [
    [PL.sub(PU).div(n), PR.sub(PL).div(n)], // front
    [PB.sub(PR).div(n), PU.sub(PB).div(n)], // right (back)
    [PR.sub(PB).div(n), PL.sub(PR).div(n)], // down
    [PU.sub(PL).div(n), PB.sub(PU).div(n)], // left (back)
  ];

  pyra.faceVectors = [
    UNITS[0][0].cross(UNITS[0][1]).unit(),
    UNITS[1][0].cross(UNITS[1][1]).unit(),
    UNITS[2][0].cross(UNITS[2][1]).unit(),
    UNITS[3][0].cross(UNITS[3][1]).unit(),
  ];

  const createPiece = function (v1: Vector3D, v2: Vector3D, v3: Vector3D): Piece {
    const pts = [v1, v2, v3];
    const v = pts[2]
      .sub(pts[1])
      .cross(pts[1].sub(pts[0]))
      .unit()
      .mul(H / n);
    const c = pts
      .reduce((ac, vc) => ac.add(vc), new Vector3D(0, 0, 0))
      .div(3)
      .add(v);

    return new Piece([new Sticker(pts), new Sticker([c, c, c])]);
  };

  for (let f = 0; f < 4; f += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        pieces.push(
          createPiece(
            ANCHORS[f].add(UNITS[f][0].mul(i).add(UNITS[f][1].mul(j))),
            ANCHORS[f].add(UNITS[f][0].mul(i + 1).add(UNITS[f][1].mul(j))),
            ANCHORS[f].add(UNITS[f][0].mul(i + 1).add(UNITS[f][1].mul(j + 1)))
          )
        );

        if (j < i) {
          pieces.push(
            createPiece(
              ANCHORS[f].add(UNITS[f][0].mul(i).add(UNITS[f][1].mul(j))),
              ANCHORS[f].add(UNITS[f][0].mul(i + 1).add(UNITS[f][1].mul(j + 1))),
              ANCHORS[f].add(UNITS[f][0].mul(i).add(UNITS[f][1].mul(j + 1)))
            )
          );
        }
      }
    }
  }

  const planes = [
    [PL, PB, PR], // D plane
    [PL, PU, PB], // L plane
    [PR, PB, PU], // R plane
    [PR, PU, PL], // F plane
  ];

  const len = PU.sub(PL).div(n).y;

  pieces.forEach(p => p.stickers.forEach(s => (s.vecs = pyra.faceVectors.map(v => v.clone()))));

  const trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    const moveId = mv[0];
    const turns = mv[1];
    const layers = mv[2];
    const direction = mv[3];
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const mu = u.mul(-1);
    const pts2 = pts1.map(p => p.add(mu.mul(len * (n - layers))));
    const ang = ((2 * Math.PI) / 3) * turns;

    const pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      const d = pieces[i].direction1(pts2[0], u, false, (s: Sticker) => !/^[xd]$/.test(s.color));

      if (d * direction < 0) {
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
  pyra.move = function (moves: any[]) {
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

  pyra.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: (2 * PI) / 3,
    };
  };

  pyra.scramble = function () {
    if (!pyra.toMove) return;

    const MOVES = n >= 2 ? (n - 2) * 20 + 10 : 0;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => /^[^xd]$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = pyra.toMove(p, s, vec) as ToMoveResult;
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang, true));
    }
  };

  pyra.applySequence = function (seq: string[]) {
    const moves = seq.map(mv => ScrambleParser.parsePyraminx(mv)[0]);
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

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let { stickers } = pieces[i];

    stickers = stickers.filter(s => s.getOrientation().abs() > EPS);
  }

  assignColors(pyra, pyra.faceColors);

  // Initial rotation
  pyra.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  pyra.raw = ANCHORS;

  return pyra;
}
