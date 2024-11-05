import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface } from "@interfaces";
import { STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function BDG(): PuzzleInterface {
  const bdg: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["y", "o", "g", "w", "r", "b"],
    move: () => true,
    roundParams: {},
  };

  bdg.getAllStickers = getAllStickers.bind(bdg);

  const PI = Math.PI;
  const PI_2 = PI / 2;

  let pieces = bdg.pieces;

  let small = new Piece([
    new Sticker([LEFT.add(UP).add(BACK), LEFT.add(UP), UP, UP.add(BACK)]),
    new Sticker([LEFT.add(UP).add(BACK), LEFT.add(BACK), LEFT, LEFT.add(UP)]),
    new Sticker([LEFT.add(UP).add(BACK), UP.add(BACK), BACK, BACK.add(LEFT)]),
  ]);

  small.stickers.forEach(s => (s.vecs = [LEFT, UP, BACK].map(e => e.clone())));

  let big = new Piece([
    new Sticker([LEFT, LEFT.add(DOWN), LEFT.add(DOWN).add(FRONT), LEFT.add(FRONT)]),
    new Sticker([RIGHT, RIGHT.add(FRONT), RIGHT.add(DOWN).add(FRONT), RIGHT.add(DOWN)]),
    new Sticker([
      LEFT.add(FRONT),
      LEFT.add(FRONT).add(DOWN),
      RIGHT.add(FRONT).add(DOWN),
      RIGHT.add(FRONT),
    ]),
    new Sticker([
      LEFT.add(FRONT),
      LEFT.add(FRONT).add(DOWN),
      RIGHT.add(FRONT).add(DOWN),
      RIGHT.add(FRONT),
    ]).rotate(CENTER, FRONT.add(DOWN), PI),
  ]);

  big.stickers.forEach(s => (s.vecs = [LEFT, FRONT, DOWN].map(e => e.clone())));

  pieces.push(small);
  pieces.push(small.rotate(CENTER, UP, PI_2));
  pieces.push(small.rotate(CENTER, LEFT, PI_2));
  pieces.push(small.rotate(CENTER, FRONT, PI));

  pieces.push(big);
  pieces.push(big.rotate(CENTER, FRONT, PI).rotate(CENTER, UP, PI_2));

  bdg.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let intersected = pieces.filter(p => p.direction1(CENTER, dir) === 0);
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: intersected.length > 0 ? [] : toMovePieces,
      ang: PI_2,
    };
  };

  bdg.scramble = function () {
    const vecs = [BACK, UP];

    function getPieces(v: Vector3D) {
      return pieces.filter(p => p.direction1(v.unit().mul(0.1), v) === 0);
    }

    getPieces(UP).map(p => p.rotate(CENTER, UP, -PI_2, true));

    const moves = 5;

    for (let i = 0; i < moves; i += 1) {
      let cant = 1 + random(3);
      let i1 = i & 1;
      let i2 = i1 ^ 1;
      getPieces(vecs[i1]).map(p => p.rotate(CENTER, vecs[i1], PI_2 * cant, true));
      getPieces(vecs[i2]).map(p => p.rotate(CENTER, vecs[i2], PI_2 * 2, true));
      getPieces(vecs[i1]).map(p => p.rotate(CENTER, vecs[i1], PI_2 * 2, true));
    }

    let cant = Math.round(Math.random()) * 2 - 1;
    let i = (moves & 1) ^ 1;

    getPieces(vecs[i]).map(p => p.rotate(CENTER, vecs[i], PI_2 * cant, true));
  };

  bdg.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  bdg.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(bdg, bdg.faceColors);

  return bdg;
}
