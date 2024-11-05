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
  let mskewb: PuzzleInterface = {
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

  let pieces = mskewb.pieces;

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
  let cornerSticker = new Sticker(
    [ANCHOR, ANCHOR.add(FRONT.mul(CORNER_LEN)), ANCHOR.add(RIGHT.mul(CORNER_LEN))],
    "",
    vecs
  );

  let cornerPiece = new Piece([
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
  let edgeSticker = new Sticker(
    [
      ANCHOR.add(FRONT.mul(CORNER_LEN)),
      ANCHOR.add(FRONT.mul(2 - CORNER_LEN)),
      ANCHOR.add(FRONT.mul(2 - CORNER_LEN)).add(new Vector3D(1, 0, -1).setLength(SQ_LEN), true),
    ],
    "",
    vecs.slice(0, 2)
  );

  let edgePiece = new Piece([edgeSticker, edgeSticker.rotate(CENTER, new Vector3D(-1, 1, 0), PI)]);

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
  let innerEdgeSticker = new Sticker(
    [
      ANCHOR.add(FRONT.mul(CORNER_LEN)),
      ANCHOR.add(FRONT.mul(CORNER_LEN)).add(new Vector3D(1, 0, 1).setLength(SQ_LEN), true),
      ANCHOR.add(RIGHT.mul(CORNER_LEN)).add(new Vector3D(1, 0, 1).setLength(SQ_LEN), true),
      ANCHOR.add(RIGHT.mul(CORNER_LEN)),
    ],
    "",
    vecs
  );

  let innerEdgePiece = new Piece([innerEdgeSticker]);

  let refs = [0, 1, 2].map(n => innerEdgePiece.rotate(CENTER, ANCHOR, TAU_3 * n));

  for (let i = 0; i < 4; i += 1) {
    pieces.push(...refs.map(r => r.rotate(CENTER, UP, PI_2 * i)));
    pieces.push(...refs.map(r => r.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i, true)));
  }

  // Centers
  let centerRef = ANCHOR.add(FRONT.mul(CORNER_LEN)).add(
    new Vector3D(1, 0, 1).setLength(SQ_LEN),
    true
  );

  let centerSticker = new Sticker(
    [0, 1, 2, 3].map(n => centerRef.rotate(CENTER, UP, PI_2 * n)),
    "",
    [...vecs, new Vector3D(1, 1, 1).unit()]
  );
  let centerPiece = new Piece([centerSticker]);

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

  let planes = [
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

  let trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    let moveId = mv[0];
    let turns = mv[1];
    let pts1 = planes[moveId];

    if (moveId >= planes.length - 3) {
      turns = (-turns * 3) / 4;
    }

    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();

    const mu = u.mul(-1);
    const ang = -2 * PI_3 * turns;

    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(pts1[0], u);
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

  mskewb.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let a = dir.setLength(0.3);
    let toMovePieces = pieces.filter(p => p.direction1(a, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: 2 * PI_3,
    };
  };

  mskewb.scramble = function () {
    let seq: string[] = [];

    for (let i = 0; i < 50; i += 1) {
      seq.push(MOVE_MAP[random(MOVE_MAP.length)]);
    }

    mskewb.move(ScrambleParser.parseSkewb(seq.join(" ")));
  };

  mskewb.applySequence = function (seq: string[]) {
    let moves = seq.map(mv => ScrambleParser.parseSkewb(mv)[0]);
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

  mskewb.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  mskewb.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(mskewb, mskewb.faceColors);

  return mskewb;
}
