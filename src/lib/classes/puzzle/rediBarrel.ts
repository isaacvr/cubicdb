import { BACK, CENTER, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import type { PiecesToMove, PuzzleInterface, ToMoveResult } from "@interfaces";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { getAllStickers, random } from "./puzzleUtils";
import { EPS, STANDARD_PALETTE } from "@constants";
import { ScrambleParser } from "@classes/scramble-parser";
import { getCircle } from "@helpers/math";
import { FaceSticker } from "./FaceSticker";

function getArc(a: Vector3D, b: Vector3D, c: Vector3D, mh: number) {
  const PPC = 40;

  const path: Vector3D[] = getCircle(a, b, c, PPC);
  console.log("PATH: ", path[0], path[path.length - 1], a, b, c);

  return path.map((n, p) => {
    const a = p / (path.length - 1);
    const h = -mh * a * (a - 1) * 4;
    return new Vector3D(n.x, h, n.z);
  });
}

function getStickerFromPaths(p1: Vector3D[], p2: Vector3D[]) {
  const petalFaces: number[][] = [];
  const pathLen = p1.length;

  for (let i = 0, maxi = pathLen - 1; i < maxi; i += 1) {
    petalFaces.push([i, i + pathLen + 1, i + pathLen]);
    petalFaces.push([i, i + 1, i + pathLen + 1]);
  }

  return new FaceSticker([...p1, ...p2], petalFaces);
}

export function REDI_BARREL(): PuzzleInterface {
  const redib: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: ["r", "g", "y", "b"],
    move: () => false,
    isRounded: true,
    roundParams: {},
  };

  redib.getAllStickers = getAllStickers.bind(redib);
  const pieces = redib.pieces;

  // Constants
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_4 = PI / 4;
  const ANG = (2 * PI) / 3;

  // Center petal
  const petalStickerB = getStickerFromPaths(
    getArc(LEFT, LEFT.rotate(CENTER, UP, PI_4), FRONT, 0.25),
    getArc(LEFT, LEFT.rotate(CENTER, UP, PI_4), FRONT, -0.25)
  );

  petalStickerB.color = petalStickerB.oColor = "d";

  const VC = LEFT.mul(1.001);
  const HC = 0.23;
  const petalStickerC = getStickerFromPaths(
    getArc(
      VC.rotate(CENTER, UP, 0.05),
      VC.rotate(CENTER, UP, PI_4),
      VC.rotate(CENTER, UP, PI_2 - 0.05),
      HC
    ),
    getArc(
      VC.rotate(CENTER, UP, 0.05),
      VC.rotate(CENTER, UP, PI_4),
      VC.rotate(CENTER, UP, PI_2 - 0.05),
      -HC
    )
  );

  pieces.push(
    ...[0, 1, 2, 3].map((n, p) => {
      petalStickerC.color = petalStickerC.oColor = redib.faceColors[p];
      return new Piece([
        petalStickerB.rotate(CENTER, UP, PI_2 * n),
        petalStickerC.rotate(CENTER, UP, PI_2 * n),
      ]);
    })
  );

  // Center
  const centerSticker1 = getStickerFromPaths(
    getArc(LEFT, LEFT.rotate(CENTER, UP, PI_4), FRONT, 0.25),
    getArc(LEFT, LEFT.rotate(CENTER, UP, PI_4), FRONT, -0.25)
  );

  // pieces.push();

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

  redib.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      const { u, ang, center } = pcs;
      const p = pcs.pieces;

      for (let i = 0, maxi = p.length; i < maxi; i += 1) {
        p[i].rotate(center || redib.center, u, ang, true);
      }
    }
    return true;
  };

  redib.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    const mc = st.updateMassCenter();
    const pcs = pieces.filter(p => p.direction1(mc, u) === 0);

    return {
      pieces: pcs,
      ang: PI_2,
    };
  };

  redib.scramble = function () {
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
      const pcs = redib.toMove!(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  redib.applySequence = function (seq: string[]) {
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

  redib.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  redib.faceVectors = [RIGHT, FRONT, LEFT, BACK];

  return redib;
}
