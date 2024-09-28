import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface } from "@interfaces";
import { STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, assignVectors, getAllStickers } from "./puzzleUtils";
import { bicube } from "@cstimer/scramble/utilscramble";

function pc(x: number, y: number, z: number) {
  return LEFT.add(UP)
    .add(BACK)
    .add(
      RIGHT.mul((2 * x) / 3)
        .add(DOWN.mul((2 * y) / 3))
        .add(FRONT.mul((2 * z) / 3))
    );
}

export function BICUBE(): PuzzleInterface {
  const bic: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["y", "g", "r", "w", "b", "o"],
    move: () => true,
    roundParams: [],
  };

  bic.getAllStickers = getAllStickers.bind(bic);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI23 = (2 * PI) / 3;

  let pieces = bic.pieces;

  let small = new Piece([
    new Sticker([pc(2, 0, 2), pc(2, 0, 3), pc(3, 0, 3), pc(3, 0, 2)]),
    new Sticker([pc(2, 0, 3), pc(2, 1, 3), pc(3, 1, 3), pc(3, 0, 3)]),
    new Sticker([pc(3, 0, 3), pc(3, 1, 3), pc(3, 1, 2), pc(3, 0, 2)]),
  ]);

  // small.stickers.forEach(s => s.vecs = [ RIGHT, UP, FRONT ].map(e => e.clone()));

  let big = new Piece([
    new Sticker([pc(0, 0, 0), pc(0, 0, 1), pc(2, 0, 1), pc(2, 0, 0)]),
    new Sticker([pc(0, 0, 0), pc(2, 0, 0), pc(2, 1, 0), pc(0, 1, 0)]),
    new Sticker([pc(0, 0, 0), pc(0, 1, 0), pc(0, 1, 1), pc(0, 0, 1)]),
    new Sticker([pc(0, 0, 1), pc(0, 1, 1), pc(2, 1, 1), pc(2, 0, 1)]),
  ]);

  // big.stickers.forEach(s => s.vecs = [ UP, BACK ].map(e => e.clone()));

  let big1 = new Piece([
    new Sticker([pc(1, 1, 0), pc(2, 1, 0), pc(2, 3, 0), pc(1, 3, 0)]),
    new Sticker([pc(1, 3, 0), pc(2, 3, 0), pc(2, 3, 2), pc(1, 3, 2)]),
  ]);

  let group = [big, big.add(FRONT.mul(2 / 3)), big.add(FRONT.mul(4 / 3))];

  pieces.push(small);

  pieces.push(...group);
  pieces.push(...group.map(e => e.rotate(CENTER, RIGHT.add(UP).add(FRONT), PI23)));
  pieces.push(...group.map(e => e.rotate(CENTER, RIGHT.add(UP).add(FRONT), -PI23)));
  pieces.push(...group.map(e => e.rotate(CENTER, FRONT, PI_2)));
  pieces.pop();
  pieces.push(big1);

  bic.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let ac = dir.unit().toNormal().div(3);
    let intersected = pieces.filter(
      p => p.direction1(ac, dir, false, (s: Sticker) => !/^[xd]{1}$/.test(s.color)) === 0
    );
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);

    return {
      pieces: intersected.length > 0 ? [] : toMovePieces,
      ang: PI_2,
    };
  };

  bic.move = function (mv: string[]) {
    let moveMap = "URFDLB";
    let scramble = mv[0].split(" ").filter(e => e);
    let moveVec = [UP, RIGHT, FRONT, DOWN, LEFT, BACK].map(v => v.div(2));

    for (let i = 0, maxi = scramble.length; i < maxi; i += 1) {
      let mv = scramble[i];
      let pos = moveMap.indexOf(mv[0]);
      let ang = mv.endsWith("'") ? PI_2 : mv.endsWith("2") ? PI : -PI_2;
      let pcs = pieces.filter(p => p.direction1(moveVec[pos], moveVec[pos]) === 0);
      pcs.forEach(p => p.rotate(CENTER, moveVec[pos], ang, true));
    }
  };

  bic.scramble = function () {
    bic.move([bicube("", 30)]);
  };

  bic.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  bic.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(bic, bic.faceColors);
  assignVectors(bic);

  pieces.forEach(p => {
    p.stickers = p.stickers.filter(s => s.color != "x");
  });

  // for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
  //   let st = pieces[i].stickers;
  //   let f: Sticker;

  //   while( true ) {
  //     f = st.find(s => s.color === 'x');

  //     if ( f ) {
  //       st.splice( st.indexOf(f), 1 );
  //       st.splice( st.indexOf(f._generator), 1 );
  //     } else {
  //       break;
  //     }
  //   }
  // }

  return bic;
}
