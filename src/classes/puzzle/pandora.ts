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
    roundParams: [],
  };

  pandora.getAllStickers = getAllStickers.bind(pandora);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG1 = (2 * PI) / 3;
  const ANG = PI_2;
  const vdir = [RIGHT, FRONT, UP];

  let pieces = pandora.pieces;

  let cornerSticker = new Sticker(
    [RIGHT.add(UP).add(FRONT), FRONT.add(UP), FRONT.add(RIGHT)],
    "",
    vdir
  );

  let corner = new Piece(
    [0, 1, 2].map(n => cornerSticker.rotate(CENTER, RIGHT.add(UP).add(FRONT), ANG1 * n))
  );

  let cornersUp = [0, 1, 2, 3].map(n => corner.rotate(CENTER, UP, PI_2 * n));

  pieces.push(...cornersUp);
  pieces.push(...cornersUp.map(c => c.rotate(CENTER, FRONT, PI)));

  let centerPTT = UP.add(BACK).add(UP.add(LEFT)).div(2);
  let centerUp = new Piece([
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

  let centers = [
    ...[0, 1, 2, 3].map(n => centerUp.rotate(CENTER, RIGHT, PI_2 * n)),
    centerUp.rotate(CENTER, FRONT, PI_2),
    centerUp.rotate(CENTER, FRONT, -PI_2),
  ];

  pieces.push(...centers);

  let topEdgeS = new Sticker([centerPTT, LEFT.add(UP), centerPTT.rotate(CENTER, UP, PI_2)], "", [
    UP,
    LEFT,
    FRONT,
  ]);

  let topEdgeB = new Sticker([
    BACK.add(LEFT).div(2).add(UP),
    BACK.add(UP).div(2).add(LEFT),
    LEFT.add(UP),
  ]);

  let topEdgeP = new Piece([
    topEdgeS,
    topEdgeS.rotate(CENTER, LEFT.add(UP), PI),
    topEdgeB,
    topEdgeB.rotate(CENTER, LEFT.add(UP), PI),
  ]);

  let topEdges = [0, 1, 2, 3].map(n => topEdgeP.rotate(CENTER, UP, PI_2 * n));

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
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  pandora.scramble = function () {
    if (!pandora.toMove) return;

    const MOVES = 100;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random(pieces) as Piece;
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = pandora.toMove(p, s, vec) as ToMoveResult;
      let cant = 1 + random(3);
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
