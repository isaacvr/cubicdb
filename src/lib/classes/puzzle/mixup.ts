import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function MIXUP(): PuzzleInterface {
  const n = 3;
  const len = 2;

  const mixup: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [n, n, n],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {},
  };

  mixup.getAllStickers = getAllStickers.bind(mixup);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [RIGHT, FRONT, UP];
  const R = 1 / (1 + Math.SQRT2);
  const L = R * Math.SQRT2;

  const pieces = mixup.pieces;
  const LUB = LEFT.add(UP).add(BACK);
  const RUB = RIGHT.add(UP).add(BACK);
  const LUF = LEFT.add(UP).add(FRONT);
  const ref1 = LUB.sub(LUB.mul(L / 2));

  const cornerSticker = new Sticker([
    LUB,
    LUB.add(FRONT.mul(L)),
    LUB.add(FRONT.add(RIGHT).mul(L)),
    LUB.add(RIGHT.mul(L)),
  ]);

  const corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(LUB, LUB, (2 * PI) / 3),
    cornerSticker.rotate(LUB, LUB, (-2 * PI) / 3),
    cornerSticker.reflect1(ref1, UP, true),
    cornerSticker.rotate(LUB, LUB, (-2 * PI) / 3).reflect1(ref1, RIGHT, true),
    cornerSticker.rotate(LUB, LUB, (2 * PI) / 3).reflect1(ref1, BACK, true),
  ]);

  corner.stickers.forEach(s => {
    s.vecs = [LEFT, UP, BACK].map(v => v.clone());
  });

  for (let i = 0; i < 4; i += 1) {
    pieces.push(corner.rotate(CENTER, UP, PI_2 * i));
    pieces.push(corner.rotate(CENTER, FRONT, PI / 2).rotate(CENTER, UP, PI_2 * i));
  }

  const edgeSticker1 = new Sticker([
    LUB.add(FRONT.mul(L)),
    LUF.add(BACK.mul(L)),
    LUF.add(BACK.add(RIGHT).mul(L)),
    LUB.add(FRONT.add(RIGHT).mul(L)),
  ]);

  const edgeSticker2 = new Sticker([
    LUF.add(BACK.mul(L)),
    LUF.add(BACK.add(DOWN).mul(L)),
    LUF.add(BACK.add(RIGHT).mul(L)),
  ]);

  const edgeSticker3 = new Sticker([
    LUB.add(FRONT.add(RIGHT).mul(L)),
    LUF.add(BACK.add(RIGHT).mul(L)),
    LEFT.add(UP)
      .add(RIGHT.mul(L))
      .add(RIGHT.add(DOWN).setLength(L / 2)),
  ]);

  const edgePiece = new Piece([
    edgeSticker1,
    edgeSticker1.rotate(LEFT.add(UP), LEFT.add(UP), PI),
    edgeSticker2,
    edgeSticker2.rotate(LEFT.add(UP), LEFT.add(UP), PI),
    edgeSticker3,
    edgeSticker3.rotate(LEFT.add(UP), LEFT.add(UP), PI),
  ]);

  edgePiece.stickers.forEach(s => {
    s.vecs = [...vdir, RIGHT.add(UP).unit()].map(v => v.clone());
  });

  for (let i = 0; i < 4; i += 1) {
    pieces.push(edgePiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(LUB, LUB, (-2 * PI) / 3).rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  const centerSticker = new Sticker([
    LUB.add(FRONT.add(RIGHT).mul(L)),
    RUB.add(FRONT.add(LEFT).mul(L)),
    RUB.add(DOWN.add(LEFT).mul(L)),
    LUB.add(DOWN.add(RIGHT).mul(L)),
  ]);

  const centerPiece = new Piece([
    centerSticker.rotate(CENTER, RIGHT, PI / 4),
    new Sticker([
      LUB.add(RIGHT.add(DOWN).mul(L)),
      LUB.add(RIGHT.add(FRONT).add(DOWN).mul(L)),
      LUB.add(RIGHT.add(FRONT).mul(L)),
    ]).rotate(CENTER, RIGHT, PI / 4),
    new Sticker([
      RUB.add(LEFT.add(DOWN).mul(L)),
      RUB.add(LEFT.add(FRONT).mul(L)),
      RUB.add(LEFT.add(FRONT).add(DOWN).mul(L)),
    ]).rotate(CENTER, RIGHT, PI / 4),
    new Sticker([
      LUB.add(RIGHT.add(DOWN).mul(L)),
      RUB.add(LEFT.add(DOWN).mul(L)),
      RUB.add(LEFT.add(DOWN).add(FRONT).mul(L)),
      LUB.add(RIGHT.add(DOWN).add(FRONT).mul(L)),
    ]).rotate(CENTER, RIGHT, PI / 4),
    new Sticker([
      LUB.add(RIGHT.add(DOWN).mul(L)),
      RUB.add(LEFT.add(DOWN).mul(L)),
      RUB.add(LEFT.add(DOWN).add(FRONT).mul(L)),
      LUB.add(RIGHT.add(DOWN).add(FRONT).mul(L)),
    ])
      .rotate(UP.add(BACK).mul(R), UP.add(BACK).mul(R), PI)
      .rotate(CENTER, RIGHT, PI / 4),
  ]);

  centerPiece.stickers.forEach(s => {
    s.vecs = vdir.map(v => v.clone());
  });

  for (let i = 0; i < 4; i += 1) {
    pieces.push(centerPiece.rotate(CENTER, FRONT, PI_2 * i));
    i < 2 && pieces.push(centerPiece.rotate(CENTER, RIGHT, PI_2 * Math.pow(-1, i)));
  }

  mixup.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const type = piece.stickers.filter(s => !s.color.match(/^[xd]$/)).length;
    const mc = piece.updateMassCenter();
    const planes = piece.stickers.reduce((ac: Vector3D[][], s) => {
      if (s.color === "x" && s.getOrientation().cross(dir).abs() < EPS) {
        ac.push([s._generator.points[0], s._generator.getOrientation()]);
      }
      return ac;
    }, []);

    planes.push([piece.updateMassCenter(), dir.unit()]);

    const crossed: Piece[] = pieces.reduce((ac: Piece[], p) => {
      const st = p.stickers.filter(s =>
        planes.reduce((ac1, p1) => {
          if (/^[xd]$/.test(s.color)) {
            return ac1;
          }
          return ac1 || s.direction1(p1[0], p1[1]) === 0;
        }, false)
      );
      st.length && ac.push(p);
      return ac;
    }, []);

    if (crossed.length) {
      const crossCorner = !!crossed.find(
        p => p.stickers.filter(s => /^[^xd]$/.test(s.color)).length == 3
      );
      if (type < 3 && crossCorner) {
        return { pieces: [], ang: 0 };
      }
    }

    const toMovePieces =
      type == 3
        ? pieces.filter(p => p.direction1(mc, dir) >= 0)
        : pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: type < 3 ? PI / 4 : PI_2,
    };
  };

  mixup.scramble = function () {
    if (!mixup.toMove) return;

    const MOVES = 50;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = mixup.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  mixup.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  mixup.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(mixup, mixup.faceColors);

  return mixup;
}
