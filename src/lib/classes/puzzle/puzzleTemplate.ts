import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import type { PiecesToMove, PuzzleInterface, ToMoveResult } from "@interfaces";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { EPS, STANDARD_PALETTE } from "@constants";
import { ScrambleParser } from "@classes/scramble-parser";

export function PUZZLE(): PuzzleInterface {
  const puzzle: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {
      // rd?: number | Function
      // scale?: number
      // ppc?: number
      // fn?: Function
      // justScale?: boolean
    },
  };

  puzzle.getAllStickers = getAllStickers.bind(puzzle);
  const pieces = puzzle.pieces;

  // Constants
  const PI = Math.PI;
  const PI_2 = PI / 2;

  // Piece type 1

  // Piece type 2

  // Piece type 3

  // Interaction
  const planes: Vector3D[][] = [];

  const trySingleMove = (mv: any): PiecesToMove | null => {
    const moveId = mv[0];
    const turns = mv[1];
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const anc = pts1[0];

    const pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      const d = pieces[i].direction1(anc, u, true);

      if (d === 0) {
        console.log("Invalid move. Piece intersection detected.", mv, turns, mv);
        console.log("Piece: ", i, pieces[i], pts1);
        return null;
      }

      if (d * mv[2] > 0) {
        pcs.push(pieces[i]);
      }
    }

    return {
      pieces: pcs,
      u,
      ang: PI_2,
    };
  };

  puzzle.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      const { u, ang, center } = pcs;
      const p = pcs.pieces;

      for (let i = 0, maxi = p.length; i < maxi; i += 1) {
        p[i].rotate(center || puzzle.center, u, ang, true);
      }
    }
    return true;
  };

  puzzle.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    const mc = st.updateMassCenter();
    const pcs = pieces.filter(p => p.direction1(mc, u) === 0);

    return {
      pieces: pcs,
      ang: PI_2,
    };
  };

  puzzle.scramble = function () {
    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      if (!p) {
        i -= 1;
        continue;
      }
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      if (!s) {
        i -= 1;
        continue;
      }
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      if (!vec) {
        i -= 1;
        continue;
      }
      const pcs = puzzle.toMove!(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  puzzle.applySequence = function (seq: string[]) {
    const moves = seq.map(mv => ScrambleParser.parseNNN(mv, { a: 3, b: 3, c: 3 })[0]);
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

  puzzle.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  puzzle.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(puzzle, puzzle.faceColors);

  return puzzle;
}
