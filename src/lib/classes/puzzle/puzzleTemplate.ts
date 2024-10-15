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
    roundParams: [
      // (Sticker => number | [number] | null), scale, PPC, fn, justScale
    ],
  };

  puzzle.getAllStickers = getAllStickers.bind(puzzle);
  let pieces = puzzle.pieces;

  // Constants
  const PI = Math.PI;
  const PI_2 = PI / 2;

  // Piece type 1

  // Piece type 2

  // Piece type 3

  // Interaction
  let planes: Vector3D[][] = [];

  let trySingleMove = (mv: any): PiecesToMove | null => {
    let moveId = mv[0];
    let turns = mv[1];
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const anc = pts1[0];

    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(anc, u, true);

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
      let mv = moves[m];
      let pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      let { u, ang, center } = pcs;
      let p = pcs.pieces;

      for (let i = 0, maxi = p.length; i < maxi; i += 1) {
        p[i].rotate(center || puzzle.center, u, ang, true);
      }
    }
    return true;
  };

  puzzle.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    let mc = st.updateMassCenter();
    let pcs = pieces.filter(p => p.direction1(mc, u) === 0);

    return {
      pieces: pcs,
      ang: PI_2,
    };
  };

  puzzle.scramble = function () {
    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random(pieces) as Piece;
      if (!p) {
        i -= 1;
        continue;
      }
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      if (!s) {
        i -= 1;
        continue;
      }
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      if (!vec) {
        i -= 1;
        continue;
      }
      let pcs = puzzle.toMove!(p, s, vec) as ToMoveResult;
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  puzzle.applySequence = function (seq: string[]) {
    let moves = seq.map(mv => ScrambleParser.parseNNN(mv, { a: 3, b: 3, c: 3 })[0]);
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

  puzzle.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  puzzle.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(puzzle, puzzle.faceColors);

  return puzzle;
}
