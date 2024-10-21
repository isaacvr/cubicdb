import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import type { PiecesToMove, PuzzleInterface, ToMoveResult } from "@interfaces";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { EPS, STANDARD_PALETTE } from "@constants";
import { ScrambleParser } from "@classes/scramble-parser";
import { bezier, circle, cmd } from "@helpers/math";
import { FaceSticker } from "./FaceSticker";

export function VOID(): PuzzleInterface {
  const voidC: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [3, 3, 3],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: [
      // (Sticker => number | [number] | null), scale, PPC, fn, justScale
    ],
  };

  voidC.getAllStickers = getAllStickers.bind(voidC);
  let pieces = voidC.pieces;

  // Constants
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const TAU_3 = (2 * PI) / 3;
  const LEN = 2 / 3;
  const PPC = 10;
  const LAYERS = 20;

  // Corners
  let cornerSticker = new Sticker(
    [
      cmd("FRU", "LD", LEN),
      ...bezier([cmd("FRU", "D", LEN), cmd("FRU"), cmd("FRU", "L", LEN)], 20),
    ],
    "",
    [UP, RIGHT, FRONT]
  );

  let mat: Vector3D[][] = [];
  let vts: number[][] = [];

  let c1 = circle(
    new Vector3D(1 / 3, 1, 1),
    new Vector3D(1, 1, 1),
    new Vector3D(1, 1 / 3, 1),
    LAYERS
  );
  let c2 = circle(
    new Vector3D(1, 1, 1 / 3),
    new Vector3D(1, 1, 1),
    new Vector3D(1, 1 / 3, 1),
    LAYERS
  );

  for (let i = 0; i < LAYERS; i += 1) {
    mat.push(circle(c1[i], new Vector3D(1, c1[i].y, 1), c2[i], LAYERS - i));
  }

  mat.push([c1[c1.length - 1]]);

  let MT = ((LAYERS + 1) * (LAYERS + 2)) / 2;
  let getPos = (i: number, j: number) => MT - ((LAYERS - i + 2) * (LAYERS - i + 1)) / 2 + j;
  for (let i = 0; i <= LAYERS; i += 1) {
    for (let j = 0, maxj = LAYERS - i - 1; j <= maxj; j += 1) {
      vts.push([getPos(i, j), getPos(i + 1, j), getPos(i, j + 1)]);

      if (j < maxj) {
        vts.push([getPos(i, j + 1), getPos(i + 1, j), getPos(i + 1, j + 1)]);
      }
    }
  }

  let curveSticker = new FaceSticker(
    mat.reduce((acc, e) => [...acc, ...e], []),
    vts,
    "darkGray"
  );

  curveSticker.nonInteractive = true;

  let cornerPiece = new Piece([
    cornerSticker,
    cornerSticker.rotate(CENTER, cmd("FRU"), TAU_3),
    cornerSticker.rotate(CENTER, cmd("FRU"), -TAU_3),
    curveSticker,
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      cornerPiece.rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );

  // Edges
  let edgeSticker = new Sticker([cmd("FRU", "L", 2 / 3), cmd("FLU", "R", 2 / 3)]);

  const ANG1 = 1.5 * PI_2;
  const ANG2 = 0.5 * PI_2;
  const RAD = Math.SQRT2 / 3;

  for (let i = 0; i <= PPC; i += 1) {
    let a = i / PPC;
    let ang = ANG1 * (1 - a) + ANG2 * a;
    let v = new Vector3D(Math.cos(ang) * RAD, Math.sin(ang) * RAD, 1);
    edgeSticker.points.push(v);
  }

  edgeSticker.updateMassCenter();
  edgeSticker.vecs = [UP, FRONT, RIGHT].map(v => v.clone());

  let edgePiece = new Piece([edgeSticker, edgeSticker.rotate(CENTER, cmd("FU"), PI)]);

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      edgePiece.rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );
  pieces.push(
    ...[0, 1, 2, 3].map(n =>
      edgePiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * n, true)
    )
  );

  // Interaction
  const MOVE_MAP = "URFDLB";

  const ref = cmd("LUB");
  const ref1 = cmd("FRD");

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
    layers = layers === 3 ? 4 : layers;

    const pts2 = pts1.map(p => p.add(mu.mul(LEN * layers)));
    const pts3 = pts2.map(p => p.add(u.mul(LEN * span)));
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

  voidC.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      let { u, ang, center } = pcs;
      let p = pcs.pieces;

      for (let i = 0, maxi = p.length; i < maxi; i += 1) {
        p[i].rotate(center || voidC.center, u, ang, true);
      }
    }
    return true;
  };

  voidC.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    let mc = st.updateMassCenter();
    let pcs = pieces.filter(p => p.direction1(mc, u) === 0);

    return {
      pieces: pcs,
      ang: PI_2,
    };
  };

  voidC.scramble = function () {
    const MOVES = 100;

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
      let pcs = voidC.toMove!(p, s, vec) as ToMoveResult;
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  voidC.applySequence = function (seq: string[]) {
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

  voidC.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  voidC.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(voidC, voidC.faceColors);

  return voidC;
}
