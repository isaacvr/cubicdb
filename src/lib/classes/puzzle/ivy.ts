import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function IVY(): PuzzleInterface {
  const ivy: PuzzleInterface = {
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

  ivy.getAllStickers = getAllStickers.bind(ivy);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG = (2 * PI) / 3;

  const p1 = LEFT.add(UP).add(BACK);
  const p2 = LEFT.add(UP).add(FRONT);
  const p3 = RIGHT.add(UP).add(FRONT);
  const p4 = RIGHT.add(UP).add(BACK);
  const p5 = RIGHT.add(DOWN).add(FRONT);
  const p6 = LEFT.add(DOWN).add(BACK);

  const cornerSticker = new Sticker([p1]);

  const curvePoints: Vector3D[] = [];

  for (let i = 0, maxi = 25; i <= maxi; i += 1) {
    const alpha = i / maxi;
    curvePoints.push(p3.add(LEFT.mul(2).rotate(CENTER, DOWN, alpha * PI_2)));
  }

  cornerSticker.points.push(...curvePoints.map(e => e.clone()));

  const centerPiece = new Piece([
    new Sticker([
      ...curvePoints.map(e => e.clone()).reverse(),
      ...curvePoints.map((e: Vector3D) => e.rotate(CENTER, UP, PI)).reverse(),
    ]),
  ]);

  centerPiece.stickers[0].vecs = [p1.unit(), p3.unit()];

  centerPiece.stickers[0].points.pop();

  const corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(CENTER, p1, ANG),
    cornerSticker.rotate(CENTER, p1, -ANG),
  ]);

  corner.stickers.forEach(s => (s.vecs = [p1.unit()]));

  const pieces = ivy.pieces;

  pieces.push(
    corner,
    corner.rotate(CENTER, UP, PI),
    corner.rotate(CENTER, LEFT, PI),
    corner.rotate(CENTER, LEFT, PI).rotate(CENTER, UP, PI),
    centerPiece,
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, RIGHT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, LEFT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, FRONT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, BACK, PI_2),
    centerPiece.rotate(CENTER, UP, PI).rotate(CENTER, RIGHT, PI)
  );

  // Fix Ivy orientation to match real cube
  pieces.forEach(p => p.rotate(CENTER, UP, PI_2, true));

  const moveMap = "RLDBxyz";

  const planes = [
    [0, 1, 2].map(n => p3.rotate(CENTER, p4, ANG * n)), // R
    [0, 1, 2].map(n => p3.rotate(CENTER, p2, ANG * n)), // L
    [0, 1, 2].map(n => p3.rotate(CENTER, p5, ANG * n)), // D
    [0, 1, 2].map(n => p1.rotate(CENTER, p6, ANG * n)), // B
    [CENTER, UP, FRONT].map(v => v.add(LEFT.mul(2))), // x
    [CENTER, FRONT, RIGHT].map(v => v.add(DOWN.mul(2))), // y
    [CENTER, UP, LEFT].map(v => v.add(BACK.mul(2))), // z
  ];

  ivy.move = function (scramble: string[]) {
    const moves = scramble[0].match(new RegExp(`[${moveMap}]'?`, "g"));

    if (moves) {
      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        const mv = moves[i];
        const moveId = moveMap.indexOf(mv[0]);
        const plane = planes[moveId];
        const u = Vector3D.cross(plane[0], plane[1], plane[2]).unit();
        const pcs = pieces.filter(p => p.direction1(plane[0], u) >= 0);
        let ang = Math.sign(mv.indexOf("'") + 0.1) * ANG;

        // Accept only double movements on x, y and z.
        if (moveId > 3) {
          ang = (ANG * 3) / 2;
        }

        pcs.forEach(p => p.rotate(CENTER, u, ang, true));
      }
    }

    return true;
  };

  ivy.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  ivy.scramble = function () {
    if (!ivy.toMove) return;

    const MOVES = 10;
    const corners = pieces.slice(0, 4);

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(corners) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = ivy.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(2);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  ivy.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  ivy.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(ivy, ivy.faceColors);

  return ivy;
}
