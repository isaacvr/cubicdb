import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { FaceSticker } from "./FaceSticker";
import { Vector2D } from "../vector2-d";

function clerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return a.add(b.sub(a).mul(t));
}

function cmul(a: Vector2D, b: Vector2D): Vector2D {
  return new Vector2D(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

function cinv(a: Vector2D): Vector2D {
  const scale = 1 / (a.x ** 2 + a.y ** 2);
  return new Vector2D(scale * a.x, -scale * a.y);
}

function cdiv(a: Vector2D, b: Vector2D): Vector2D {
  return cmul(a, cinv(b));
}

function circleInterpolation(a: Vector2D, m: Vector2D, b: Vector2D) {
  const b_m = b.sub(m);
  const m_a = m.sub(a);
  const ab_m = cmul(a, b_m);
  const bm_a = cmul(b, m_a);
  return (t: number) => cdiv(clerp(ab_m, bm_a, t), clerp(b_m, m_a, t));
}

function pos(x: number, y: number, L: number): number {
  return x * L + y;
}

export function DREIDEL(): PuzzleInterface {
  const dreidel: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {},
  };

  dreidel.getAllStickers = getAllStickers.bind(dreidel);

  const pieces = dreidel.pieces;

  const LU = LEFT.add(UP);
  const LUB = LU.add(BACK);
  const LUF = LU.add(FRONT);
  const RUF = RIGHT.add(UP).add(FRONT);
  const RUB = RUF.add(BACK.mul(2));
  const LDB = LEFT.add(DOWN).add(BACK);
  const LDF = LEFT.add(DOWN).add(FRONT);
  const RDF = RIGHT.add(DOWN).add(FRONT);
  const RDB = RDF.add(BACK.mul(2));

  const CORNERS = [LUB, LUF, RUF, RUB, LDB, LDF, RDF, RDB];

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_3 = PI / 3;
  const PI23 = 2 * PI_3;

  const cornerSticker = new Sticker([LUB, LU, BACK.add(UP)], "", [
    ...[LEFT, UP, BACK].map(v => v.rotate(LUB, LUB, PI23 / 2)),
    LUB.unit(),
  ]);

  const cornerPiece = new Piece([
    cornerSticker,
    cornerSticker.rotate(CENTER, LUB, PI23),
    cornerSticker.rotate(CENTER, LUB, -PI23),
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(cornerPiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(cornerPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  const centerSticker = new Sticker([
    LEFT.add(BACK),
    LEFT.add(FRONT),
    RIGHT.add(FRONT),
    RIGHT.add(BACK),
  ])
    .mul(1 / 3, true)
    .add(UP, true);

  const centerPiece = new Piece([centerSticker]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(centerPiece.rotate(CENTER, FRONT, PI_2 * i));
    i < 2 && pieces.push(centerPiece.rotate(CENTER, RIGHT, PI_2 + i * PI));
  }

  const wingSticker = new Sticker([]);

  const itpw = circleInterpolation(
    new Vector2D(-1, 0),
    new Vector2D(-1 / 3, -1 / 3),
    new Vector2D(0, -1)
  );

  for (let i = 0, maxi = 30; i <= maxi; i += 1) {
    const alpha = i / maxi;
    const pt = itpw(alpha);
    wingSticker.points.push(new Vector3D(pt.x, 1, pt.y));
  }

  wingSticker.vecs = [LUB.unit()];
  wingSticker.updateMassCenter();
  wingSticker.computeBoundingBox();

  const wingPiece = new Piece([wingSticker]);

  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      pieces.push(wingPiece.rotate(CENTER, LUB, PI23 * j).rotate(CENTER, UP, PI_2 * i));
      pieces.push(
        wingPiece
          .rotate(CENTER, LUB, PI23 * j)
          .rotate(CENTER, LEFT, PI_2)
          .rotate(CENTER, UP, PI_2 * i)
      );
    }
  }

  const edgeSticker = new Sticker([], "", [LEFT, UP]);
  const curve1: Vector3D[] = [];
  const curve2: Vector3D[] = [];

  const itpe1 = circleInterpolation(
    new Vector2D(0, -1),
    new Vector2D(-1 / 3, -1 / 3),
    new Vector2D(-1, 0)
  );

  const itpe2 = circleInterpolation(
    new Vector2D(-1, 0),
    new Vector2D(-1 / 3, 1 / 3),
    new Vector2D(0, 1)
  );

  edgeSticker.points.push(centerSticker.points[0].add(centerSticker.points[1]).div(2));

  for (let i = 0, maxi = 10; i <= maxi; i += 1) {
    const alpha = i / maxi / 2;
    const p1 = itpe1(alpha + 0.5);
    const p2 = itpe2(alpha);
    curve1.push(new Vector3D(p1.x, 1, p1.y));
    curve2.push(new Vector3D(p2.x, 1, p2.y));
  }

  edgeSticker.points.push(...curve1, ...curve2);
  edgeSticker.updateMassCenter();
  edgeSticker.computeBoundingBox();

  const edgePiece = new Piece([edgeSticker, edgeSticker.rotate(LU, LU, PI)]);

  let bsPoints = [];
  const bsFaces: number[][] = [];
  const curves: Vector3D[][] = [];

  const H = 5;
  const V = curve2.length;

  for (let i = 0, maxi = H - 1; i <= maxi; i += 1) {
    const alpha = i / maxi;
    curves.push(curve2.map(p => p.rotate(LU, BACK, PI_2 * alpha)));
  }

  for (let i = 0, maxi = H - 1; i < maxi; i += 1) {
    for (let j = 0, maxj = V - 1; j < maxj; j += 1) {
      bsFaces.push([pos(i, j, V), pos(i + 1, j, V), pos(i, j + 1, V)]);
      bsFaces.push([pos(i + 1, j, V), pos(i + 1, j + 1, V), pos(i, j + 1, V)]);
    }
  }

  bsPoints = curves.reduce((ac, arr) => {
    ac.push(...arr);
    return ac;
  }, []);

  const blackSticker = new FaceSticker(bsPoints, bsFaces, "d");

  edgePiece.stickers.push(blackSticker);
  edgePiece.stickers.push(blackSticker.reflect1(LU, BACK));
  edgePiece.updateMassCenter();

  for (let i = 0; i < 4; i += 1) {
    pieces.push(edgePiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, LEFT, PI).rotate(CENTER, UP, PI_2 * i));
  }

  dreidel.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const normalTurn = [LEFT, UP, BACK].reduce((ac, v) => ac || v.cross(dir).abs() < EPS, false);
    const cornerTurn = CORNERS.reduce((ac, v) => ac || v.cross(dir).abs() < EPS, false);

    if (!normalTurn && !cornerTurn) {
      return {
        pieces: [],
        ang: 0,
      };
    } else if (!normalTurn) {
      const stmc = sticker.getMassCenter();
      const closest = <Vector3D>CORNERS.reduce(
        (acc: any, c) => {
          const dist = c.sub(stmc).abs();
          if (dist < acc[0]) {
            return [dist, c];
          }
          return acc;
        },
        [Infinity, new Vector3D(0, 0, 0)]
      )[1];

      const res = pieces.filter(p => {
        const mc = p.getMassCenter();
        return mc.sub(closest).abs() <= 1;
      });
      return {
        pieces: res,
        ang: PI_3,
      };
    }

    const cmp = [dir.x, dir.y, dir.z].map(e =>
      Math.abs(1 - Math.abs(e)) < EPS ? Math.sign(e) : 0
    );
    const dir1 = new Vector3D(cmp[0], cmp[1], cmp[2]);
    const pcs = pieces.reduce(
      (ac: Piece[][], p) => {
        const d = p.direction1(dir1.mul(1 / 3), dir1);
        if (d >= 0) {
          ac[d].push(p);
        }
        return ac;
      },
      [[], []]
    );

    return {
      pieces: pcs[0].length > 0 ? [] : pcs[1],
      ang: PI_2,
    };
  };

  dreidel.scramble = function () {
    const w = pieces.slice(14, 38);
    const v = [FRONT, RIGHT, UP];

    for (let i = 0, maxi = w.length; i < maxi; i += 1) {
      const pc = w[i];
      const st = pc.stickers[0];
      const o = st.getOrientation();

      if (v.some(e => e.cross(o).abs() < EPS)) {
        const pcs = dreidel.toMove!(pc, st, st.vecs[0]) as ToMoveResult;
        const cant = random(3) * 2 + 1;
        pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, st.vecs[0], pcs.ang * cant, true));
      }
    }

    const edges = pieces.slice(38);

    for (let i = 0; i < 5; i += 1) {
      for (let j = 0; j < 10; j += 1) {
        const pc = random(edges) as Piece;
        const st = random(pc.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
        const vec = random(st.vecs);
        const cant = 1 + random(3);
        const pcs = dreidel.toMove!(pc, st, vec) as ToMoveResult;
        pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
      }

      for (let j = 0; j < 4; j += 1) {
        const pc = random(w) as Piece;
        const st = random(pc.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
        const vec = random(st.vecs);
        const cant = random(3);
        const pcs = dreidel.toMove!(pc, st, vec) as ToMoveResult;
        pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant * 2, true));
      }
    }

    for (let i = 0, maxi = w.length; i < maxi; i += 1) {
      const pc = w[i];
      const st = pc.stickers[0];
      const o = st.getOrientation();

      if (v.some(e => e.cross(o).abs() > EPS)) {
        const pcs = dreidel.toMove!(pc, st, st.vecs[0]) as ToMoveResult;
        pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, st.vecs[0], pcs.ang, true));
      }
    }
  };

  dreidel.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  dreidel.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(dreidel, dreidel.faceColors);

  dreidel.getAllStickers().forEach(s => {
    if (s instanceof FaceSticker) {
      s.color = "d";
      s.oColor = "d";
    }
  });

  return dreidel;
}
