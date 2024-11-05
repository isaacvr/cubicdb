import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "@classes/vector3d";
import { Vector3D } from "@classes/vector3d";
import type { PiecesToMove, PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import {
  assignColors,
  extrudeSticker,
  getAllStickers,
  random,
  roundStickerCorners,
} from "./puzzleUtils";
import { TextSticker } from "./TextSticker";
import { FaceSticker } from "./FaceSticker";

export function TIME_MACHINE(): PuzzleInterface {
  const tm: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {},
  };

  tm.getAllStickers = getAllStickers.bind(tm);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const INNER_RAD = 0.55;
  const OUTER_RAD = 0.95;
  const PPC = 7;
  const TM_ANG = PI / 6;
  const NUMBER_HEIGHT = 0.3;

  let pieces = tm.pieces;

  // Numbers
  let numberVecs: Vector3D[] = [];

  for (let i = 0; i <= PPC; i += 1) {
    let alpha = i / PPC;
    let px = OUTER_RAD * Math.cos(PI_2 - TM_ANG * (1 - alpha));
    let pz = OUTER_RAD * Math.sin(PI_2 - TM_ANG * (1 - alpha));
    numberVecs.push(new Vector3D(px, 1 + NUMBER_HEIGHT, -pz));
  }

  for (let i = 0; i <= PPC; i += 1) {
    let alpha = i / PPC;
    let px = INNER_RAD * Math.cos(PI_2 - TM_ANG * alpha);
    let pz = INNER_RAD * Math.sin(PI_2 - TM_ANG * alpha);
    numberVecs.push(new Vector3D(px, 1 + NUMBER_HEIGHT, -pz));
  }

  let numberFrame = [
    numberVecs[PPC + 1],
    numberVecs[PPC * 2 + 1],
    numberVecs[0],
    numberVecs[PPC],
  ] as const;

  let _numberSticker = new Sticker(numberVecs, "w").add(UP.mul(0.01), true);
  let numberSticker = roundStickerCorners(_numberSticker, 0.11, -1, PPC);
  let downSticker = numberSticker.add(DOWN.mul(NUMBER_HEIGHT));
  downSticker.points.forEach(pt => pt.setCoords(pt.x * 1.009, pt.y, pt.z * 1.009));
  downSticker.updateMassCenter();
  let extSticker = extrudeSticker(numberSticker, DOWN.mul(NUMBER_HEIGHT), false, false);

  let numberPieces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n, p) => {
    let textSticker = new TextSticker(numberFrame, n.toString(), "d");
    return new Piece([textSticker, numberSticker, extSticker, downSticker]).rotate(
      CENTER,
      DOWN,
      p * TM_ANG,
      true
    );
  });

  numberPieces.forEach(pc =>
    pc.stickers.forEach(st => {
      if (st instanceof TextSticker) return;
      st.vecs = [UP].map(v => v.clone());
      st.nonInteractive = false;
      st.name = "number";
    })
  );

  pieces.push(...numberPieces);
  pieces.push(...numberPieces.map(pc => pc.rotate(CENTER, RIGHT, PI)));

  for (let i = 0, maxi = numberPieces.length; i < maxi; i += 1) {
    pieces.push(numberPieces[i].rotate(CENTER, RIGHT, PI_2));
    pieces.push(numberPieces[i].rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI_2, true));
    pieces.push(numberPieces[i].rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI, true));
    pieces.push(numberPieces[i].rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, -PI_2, true));
  }

  // 2x2
  let urVecs = [UP.mul(1 + NUMBER_HEIGHT)];

  for (let i = 0; i <= PPC * 2; i += 1) {
    let alpha = i / (PPC * 2);
    let px = INNER_RAD * Math.cos(PI_2 - TM_ANG * 3 * (1 - alpha));
    let pz = INNER_RAD * Math.sin(PI_2 - TM_ANG * 3 * (1 - alpha));
    urVecs.push(new Vector3D(px, 1 + NUMBER_HEIGHT, -pz));
  }

  let urSticker = new Sticker(urVecs);
  let urExtrSticker = extrudeSticker(urSticker, DOWN.mul(NUMBER_HEIGHT), false, false);
  let urNormalSticker = new Sticker([UP, UP.add(RIGHT), UP.add(RIGHT).add(BACK), UP.add(BACK)]);
  let urPiece = new Piece([
    urSticker,
    urSticker.rotate(CENTER, new Vector3D(1, 1, -1), (2 * PI) / 3),
    urSticker.rotate(CENTER, new Vector3D(1, 1, -1), (-2 * PI) / 3),

    urExtrSticker,
    urExtrSticker.rotate(CENTER, new Vector3D(1, 1, -1), (2 * PI) / 3),
    urExtrSticker.rotate(CENTER, new Vector3D(1, 1, -1), (-2 * PI) / 3),

    urNormalSticker,
    urNormalSticker.rotate(CENTER, new Vector3D(1, 1, -1), (2 * PI) / 3),
    urNormalSticker.rotate(CENTER, new Vector3D(1, 1, -1), (-2 * PI) / 3),
  ]);

  urPiece.stickers.forEach(st => (st.vecs = [UP, BACK, RIGHT].map(v => v.clone())));

  pieces.push(...[0, 1, 2, 3].map(n => urPiece.rotate(CENTER, UP, n * PI_2)));
  pieces.push(
    ...[0, 1, 2, 3].map(n => urPiece.rotate(CENTER, RIGHT, -PI_2).rotate(CENTER, UP, n * PI_2))
  );

  let trySingleMove = (mv: any): PiecesToMove | null => {
    return null;
  };

  tm.move = function (moves: any[]) {
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

  tm.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    if (sticker.name === "number") {
      let mc = sticker.getMassCenter();
      let pcs = pieces.filter(
        pc => pc.stickers.some(st => st.name === "number") && pc.direction1(mc, dir) === 0
      );

      return {
        pieces: pcs,
        ang: TM_ANG,
      };
    }

    return {
      pieces: pieces.filter(pc => pc.direction1(CENTER, dir) >= 0),
      ang: PI_2,
    };
  };

  tm.scramble = function () {
    if (!tm.toMove) return;

    const MOVES = 10;
    const vecs = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

    for (let i = 0; i < MOVES; i += 1) {
      // Rotate numbers
      vecs.forEach(v => {
        let cant = random(11) + 1;
        let pcs = pieces.filter(
          p => p.stickers.some(st => st.name === "number") && p.direction1(v, v, true) >= 0
        );
        pcs.forEach(p => p.rotate(CENTER, v, TM_ANG * cant, true));
      });

      for (let j = 0; j < 3; j += 1) {
        let cant = random(3) + 1;
        pieces
          .filter(pc => pc.direction1(CENTER, vecs[j]) >= 0)
          .forEach(p => p.rotate(CENTER, vecs[j], PI_2 * cant, true));
      }
    }
  };

  tm.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  tm.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(tm, tm.faceColors);

  pieces.forEach(pc => {
    if (!pc.stickers.some(st => st.name === "number")) return;

    let sticker = pc.stickers.filter(
      st => !(st instanceof TextSticker) && !(st instanceof FaceSticker)
    )[0];

    let o = sticker.getOrientation();
    let col = "";

    for (let i = 0, maxi = tm.faceVectors.length; i < maxi; i += 1) {
      if (tm.faceVectors[i].sub(o).abs() < EPS) {
        col = tm.faceColors[i];
        break;
      }
    }

    pc.stickers.forEach(st => {
      if (st instanceof TextSticker) return;
      st.color = col;
    });
  });

  return tm;
}
