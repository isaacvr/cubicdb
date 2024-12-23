import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function PANDORA(): PuzzleInterface {
  const pandora: PuzzleInterface = {
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

  pandora.getAllStickers = getAllStickers.bind(pandora);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG1 = (2 * PI) / 3;
  const ANG = PI_2;
  const vdir = [RIGHT, FRONT, UP];

  const pieces = pandora.pieces;

  const cornerSticker = new Sticker(
    [RIGHT.add(UP).add(FRONT), FRONT.add(UP), FRONT.add(RIGHT)],
    "",
    vdir
  );

  const corner = new Piece(
    [0, 1, 2].map(n => cornerSticker.rotate(CENTER, RIGHT.add(UP).add(FRONT), ANG1 * n))
  );

  const cornersUp = [0, 1, 2, 3].map(n => corner.rotate(CENTER, UP, PI_2 * n));

  pieces.push(...cornersUp);
  pieces.push(...cornersUp.map(c => c.rotate(CENTER, FRONT, PI)));

  const centerPTT = UP.add(BACK).add(UP.add(LEFT)).div(2);
  const centerUp = new Piece([
    new Sticker(
      [0, 1, 2, 3].map(n => centerPTT.rotate(CENTER, UP, PI_2 * n)),
      "",
      vdir
    ),
    new Sticker(
      [0, 1, 2, 3].map(n => centerPTT.rotate(CENTER, UP, PI_2 * n).mul(0.5)),
      "",
      vdir
    ),
  ]);

  const centers = [
    ...[0, 1, 2, 3].map(n => centerUp.rotate(CENTER, RIGHT, PI_2 * n)),
    centerUp.rotate(CENTER, FRONT, PI_2),
    centerUp.rotate(CENTER, FRONT, -PI_2),
  ];

  pieces.push(...centers);

  const topEdgeS = new Sticker([centerPTT, LEFT.add(UP), centerPTT.rotate(CENTER, UP, PI_2)], "", [
    UP,
    LEFT,
    FRONT,
  ]);

  const topEdgeB = new Sticker([
    BACK.add(LEFT).div(2).add(UP),
    BACK.add(UP).div(2).add(LEFT),
    LEFT.add(UP),
  ]);

  const topEdgeP = new Piece([
    topEdgeS,
    topEdgeS.rotate(CENTER, LEFT.add(UP), PI),
    topEdgeB,
    topEdgeB.rotate(CENTER, LEFT.add(UP), PI),
  ]);

  const topEdges = [0, 1, 2, 3].map(n => topEdgeP.rotate(CENTER, UP, PI_2 * n));

  pieces.push(...topEdges);

  pieces.push(
    ...topEdges.map(e =>
      e
        .rotate(CENTER, e.stickers[0].points[1], PI_2)
        .rotate(CENTER, e.stickers[1].getOrientation().rotate(CENTER, UP, PI_2), PI_2 / 2)
        .rotate(CENTER, UP, PI_2 / 2)
    )
  );

  pieces.push(...topEdges.map(e => e.rotate(CENTER, FRONT, PI)));

  pandora.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  pandora.scramble = function () {
    if (!pandora.toMove) return;

    const MOVES = 100;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = pandora.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  pandora.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  pandora.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(pandora, pandora.faceColors);

  return pandora;
}
