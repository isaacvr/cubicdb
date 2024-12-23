import { LEFT, UP, BACK, RIGHT, FRONT, DOWN } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function MIRROR(n: number): PuzzleInterface {
  const len = 2;

  const mirror: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [n, n, n],
    faceColors: [],
    move: () => false,
    roundParams: {},
  };

  mirror.getAllStickers = getAllStickers.bind(mirror);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [RIGHT, FRONT, UP];
  const LENS = [
    [22 / 19, 1, 16 / 19],
    [25 / 19, 1, 13 / 19],
    [9 / 19, 1, 29 / 19],
  ];

  const getFactor = function (axis: number, pos: number): number {
    if (pos < 1) {
      return LENS[axis][0];
    }
    if (pos < n - 1) {
      return LENS[axis][1];
    }
    return LENS[axis][2];
  };

  const getPosition = function (axis: number, pos: number): number {
    if (pos == 0) {
      return 0;
    }
    if (pos == 1) {
      return LENS[axis][0];
    }
    return LENS[axis][0] + (pos - 1) * LENS[axis][1];
  };

  for (let z = 0; z < n; z += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (x != 0 && y != 0 && z != 0 && x != n - 1 && y != n - 1 && z != n - 1) {
          continue;
        }

        const anchor = DOWN.mul(getPosition(2, z))
          .add(FRONT.mul(getPosition(1, y)))
          .add(RIGHT.mul(getPosition(0, x)));
        const fx = getFactor(0, x);
        const fy = getFactor(1, y);
        const fz = getFactor(2, z);

        const center = anchor.add(RIGHT.mul(fx).add(FRONT.mul(fy)).add(DOWN.mul(fz)).div(2));

        const p = new Piece();
        const sUp = new Sticker([
          anchor,
          anchor.add(FRONT.mul(fy)),
          anchor.add(FRONT.mul(fy).add(RIGHT.mul(fx))),
          anchor.add(RIGHT.mul(fx)),
        ]);

        const sLeft = new Sticker([
          anchor,
          anchor.add(DOWN.mul(fz)),
          anchor.add(DOWN.mul(fz).add(FRONT.mul(fy))),
          anchor.add(FRONT.mul(fy)),
        ]);

        const sBack = new Sticker([
          anchor,
          anchor.add(RIGHT.mul(fx)),
          anchor.add(RIGHT.mul(fx).add(DOWN.mul(fz))),
          anchor.add(DOWN.mul(fz)),
        ]);

        sUp.vecs = vdir.map(e => e.clone());
        sLeft.vecs = vdir.map(e => e.clone());
        sBack.vecs = vdir.map(e => e.clone());

        p.stickers.push(sUp);
        p.stickers.push(sLeft.rotate(center, UP, PI));
        p.stickers.push(sBack.rotate(center, UP, PI));
        p.stickers.push(sUp.rotate(center, RIGHT, PI));
        p.stickers.push(sLeft);
        p.stickers.push(sBack);

        if (p.stickers.length === 1) {
          if ((z == 0 || z == n - 1) && n > 1) {
            p.stickers.push(p.stickers[0].rotate(center, RIGHT, PI));
          } else if ((x == 0 || x == n - 1) && n > 1) {
            p.stickers.push(p.stickers[0].rotate(center, UP, PI));
          } else if ((y == 0 || y == n - 1) && n > 1) {
            p.stickers.push(p.stickers[0].rotate(center, UP, PI));
          }
        }
        p.updateMassCenter();
        mirror.pieces.push(p);
      }
    }
  }

  const pieces = mirror.pieces;

  const computeBoundingBox = function () {
    const bbs = pieces.map(s => s.computeBoundingBox());
    const box = bbs.reduce(
      (ac, p) => {
        return [
          Math.min(ac[0], p[0].x),
          Math.min(ac[1], p[0].y),
          Math.min(ac[2], p[0].z),
          Math.max(ac[3], p[1].x),
          Math.max(ac[4], p[1].y),
          Math.max(ac[5], p[1].z),
        ];
      },
      [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    );

    return [new Vector3D(box[0], box[1], box[2]), new Vector3D(box[3], box[4], box[5])];
  };

  const boundingBox = computeBoundingBox();
  const ini = DOWN.mul(getPosition(2, 1))
    .add(FRONT.mul(getPosition(1, 1)))
    .add(RIGHT.mul(getPosition(0, 1)));

  const fin = DOWN.mul(getPosition(2, n - 1))
    .add(FRONT.mul(getPosition(1, n - 1)))
    .add(RIGHT.mul(getPosition(0, n - 1)));

  mirror.center = ini.add(fin).div(2);

  const c1 = boundingBox[0].add(boundingBox[1]).div(2);

  pieces.forEach(p => p.sub(c1, true).mul(len / n, true));
  mirror.center.sub(c1, true).mul(len / n, true);

  mirror.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let st = piece.stickers.find(s => s.color === "x" && s.normal().cross(dir).abs() < EPS);

    if (!st) {
      return { pieces: [], ang: PI_2 };
    }

    st = st._generator;

    const ac = st.updateMassCenter().add(st.normal().mul(-0.03));
    const toMovePieces = pieces.filter(p => p.direction1(ac, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: PI_2,
    };
  };

  mirror.scramble = function () {
    const MOVES = 100;
    const dirs = [UP, DOWN, FRONT, BACK, LEFT, RIGHT];

    for (let i = 0; i < MOVES; i += 1) {
      const dir = random(dirs);
      const pc = random(pieces) as Piece;
      const st = pc.stickers[0];
      const mv = mirror.toMove!(pc, st, dir) as ToMoveResult;
      const cant = 1 + random(3);
      mv.pieces.forEach((p: Piece) => p.rotate(mirror.center, dir, mv.ang * cant, true));
    }
  };

  mirror.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  mirror.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  mirror.faceColors = mirror.faceVectors.map(() => "lightGray");

  assignColors(mirror, mirror.faceColors);

  return mirror;
}
