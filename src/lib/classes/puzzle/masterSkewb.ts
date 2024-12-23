import { RIGHT, LEFT, DOWN, FRONT } from "./../vector3d";
import { Vector3D, CENTER, BACK, UP } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { ScrambleParser } from "@classes/scramble-parser";
import { cmd } from "@helpers/math";

export function MASTER_SKEWB(): PuzzleInterface {
  const mskewb: PuzzleInterface = {
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

  mskewb.getAllStickers = getAllStickers.bind(mskewb);

  const pieces = mskewb.pieces;

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_3 = PI / 3;
  const TAU_3 = (2 * PI) / 3;
  const CORNER_LEN = 0.5;
  const SQ_LEN = Math.sqrt(CORNER_LEN ** 2 * 2);
  const ANCHOR = UP.add(LEFT).add(BACK);
  const vecs = [new Vector3D(-1, 1, -1), new Vector3D(-1, 1, 1), new Vector3D(1, 1, -1)].map(v =>
    v.unit()
  );

  // Corner
  const cornerSticker = new Sticker(
    [ANCHOR, ANCHOR.add(FRONT.mul(CORNER_LEN)), ANCHOR.add(RIGHT.mul(CORNER_LEN))],
    "",
    vecs
  );

  const cornerPiece = new Piece([
    cornerSticker,
    cornerSticker.rotate(CENTER, ANCHOR, TAU_3),
    cornerSticker.rotate(CENTER, ANCHOR, -TAU_3),
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      cornerPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );

  // Edge
  const edgeSticker = new Sticker(
    [
      ANCHOR.add(FRONT.mul(CORNER_LEN)),
      ANCHOR.add(FRONT.mul(2 - CORNER_LEN)),
      ANCHOR.add(FRONT.mul(2 - CORNER_LEN)).add(new Vector3D(1, 0, -1).setLength(SQ_LEN), true),
    ],
    "",
    vecs.slice(0, 2)
  );

  const edgePiece = new Piece([
    edgeSticker,
    edgeSticker.rotate(CENTER, new Vector3D(-1, 1, 0), PI),
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      edgePiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, LEFT, PI).rotate(CENTER, UP, PI_2 * n, true))
  );

  // Inner edges
  const innerEdgeSticker = new Sticker(
    [
      ANCHOR.add(FRONT.mul(CORNER_LEN)),
      ANCHOR.add(FRONT.mul(CORNER_LEN)).add(new Vector3D(1, 0, 1).setLength(SQ_LEN), true),
      ANCHOR.add(RIGHT.mul(CORNER_LEN)).add(new Vector3D(1, 0, 1).setLength(SQ_LEN), true),
      ANCHOR.add(RIGHT.mul(CORNER_LEN)),
    ],
    "",
    vecs
  );

  const innerEdgePiece = new Piece([innerEdgeSticker]);

  const refs = [0, 1, 2].map(n => innerEdgePiece.rotate(CENTER, ANCHOR, TAU_3 * n));

  for (let i = 0; i < 4; i += 1) {
    pieces.push(...refs.map(r => r.rotate(CENTER, UP, PI_2 * i)));
    pieces.push(...refs.map(r => r.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i, true)));
  }

  // Centers
  const centerRef = ANCHOR.add(FRONT.mul(CORNER_LEN)).add(
    new Vector3D(1, 0, 1).setLength(SQ_LEN),
    true
  );

  const centerSticker = new Sticker(
    [0, 1, 2, 3].map(n => centerRef.rotate(CENTER, UP, PI_2 * n)),
    "",
    [...vecs, new Vector3D(1, 1, 1).unit()]
  );
  const centerPiece = new Piece([centerSticker]);

  pieces.push(...[0, 1].map(n => centerPiece.rotate(CENTER, FRONT, PI * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      centerPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );

  // Movement
  const MOVE_MAP = "FURLBfrlbxyz";
  const SS = CORNER_LEN; // Short side
  const LS = 2 - CORNER_LEN; // Long side

  const planes = [
    [cmd("FLU", "D", LS), cmd("FLU", "R", LS), cmd("RUB", "F", LS)], // F
    [cmd("FRU", "B", LS), cmd("FRU", "L", LS), cmd("BRU", "D", SS)], // U
    [cmd("FRU", "D", LS), cmd("FRU", "B", LS), cmd("BRU", "L", SS)], // R
    [cmd("FRU", "L", LS), cmd("FRU", "D", LS), cmd("FLU", "B", SS)], // L
    [cmd("BRU", "D", LS), cmd("BRU", "L", LS), cmd("FLU", "B", LS)], // B
    [cmd("BLU", "F", LS), cmd("BLU", "R", LS), cmd("BRU", "D", SS)], // f
    [cmd("FLU", "R", LS), cmd("FLU", "B", LS), cmd("FRU", "D", SS)], // r
    [cmd("BRU", "L", LS), cmd("BRU", "F", LS), cmd("FRU", "D", SS)], // l
    [cmd("FRU", "B", LS), cmd("FRU", "L", LS), cmd("BRU", "D", SS)], // b

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

  mskewb.move = function (moves: any[]) {
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

  mskewb.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const a = dir.setLength(0.3);
    const toMovePieces = pieces.filter(p => p.direction1(a, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: 2 * PI_3,
    };
  };

  mskewb.scramble = function () {
    const seq: string[] = [];

    for (let i = 0; i < 50; i += 1) {
      seq.push(MOVE_MAP[random(MOVE_MAP.length)]);
    }

    mskewb.move(ScrambleParser.parseSkewb(seq.join(" ")));
  };

  mskewb.applySequence = function (seq: string[]) {
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

  mskewb.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  mskewb.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(mskewb, mskewb.faceColors);

  return mskewb;
}
