import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { EPS, STANDARD_PALETTE } from "@constants";
import { cmd } from "@helpers/math";

export function GHOST(): PuzzleInterface {
  const ghost: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(-0.3, -0.3, 0, true),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {},
  };

  ghost.getAllStickers = getAllStickers.bind(ghost);
  const pieces = ghost.pieces;

  // Constants
  const PI = Math.PI;
  const PI_2 = PI / 2;

  // Piece type 1
  const topSticker = new Sticker([cmd("ULB"), cmd("ULF"), cmd("URF"), cmd("URB")]);

  const topPiece = new Piece([
    ...[0, 1, 2].map(n => topSticker.rotate(CENTER, cmd("ULB"), (2 * n * PI) / 3)),
    ...[0, 1, 2].map(n =>
      topSticker
        .rotate(CENTER, cmd("ULB"), (2 * n * PI + PI) / 3)
        .reflect1(CENTER, cmd("ULB"), true)
    ),
  ]);

  const planes = [RIGHT, UP, FRONT, DOWN, LEFT, BACK].map(v => [v.mul(1 / 3), v.clone()]);
  let pieceList = [topPiece];

  planes.forEach(plane => {
    // plane.forEach(pt =>
    //   pt
    //     .rotate(CENTER, UP, PI_2 * -0.2, true)
    //     .rotate(CENTER, FRONT, PI_2 * -0.1, true)
    //     .rotate(CENTER, RIGHT, PI_2 * 0.08, true)
    // );
    plane[1]
      .rotate(CENTER, UP, PI_2 * -0.2, true)
      .rotate(CENTER, FRONT, PI_2 * -0.1, true)
      .rotate(CENTER, RIGHT, PI_2 * 0.08, true);

    plane[0].add(ghost.center, true);
  });

  for (let i = 0, maxi = planes.length; i < maxi; i += 1) {
    pieceList = pieceList.reduce(
      (acc, pc) => [...acc, ...pc.cutPlane(planes[i][0], planes[i][1])],
      [] as Piece[]
    );
  }

  for (let i = 0, maxi = planes.length; i < maxi; i += 1) {
    const pcs = pieceList.filter(pc => pc.direction1(planes[i][0], planes[i][1], true) > 0);

    pcs.forEach(pc =>
      pc.stickers.forEach(
        st => (st.vecs = i === 0 ? [planes[i][1].clone()] : [...st.vecs, planes[i][1].clone()])
      )
    );
  }

  pieces.push(...pieceList);

  // Interaction
  ghost.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    const pl = planes.filter(p => p[1].equals(u))[0];
    const cnt = pl[0].sub(ghost.center).mul(1.5).add(ghost.center);
    const v = pl[1];
    const pcs = pieces.filter(
      p => p.direction1(cnt, v, false, (x: Sticker) => !/[xd]/.test(x.color)) >= 0
    );

    return {
      pieces: pcs,
      ang: PI_2,
      dir: v,
      center: ghost.center,
    };
  };

  ghost.scramble = function () {
    const MOVES = 30;

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
      const pcs = ghost.toMove!(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(ghost.center, vec, pcs.ang * cant, true));
    }
  };

  ghost.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  ghost.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(ghost, ghost.faceColors);

  return ghost;
}
