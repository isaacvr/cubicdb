import { UP, BACK, DOWN, CENTER, RIGHT, FRONT, LEFT } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers, random, scaleSticker } from './puzzleUtils';
import { EPS, STANDARD_PALETTE } from '@constants';
import { ScrambleParser } from '@classes/scramble-parser';
import { utilscramble } from '@cstimer/scramble/utilscramble';

export function HELICOPTER(): PuzzleInterface {
  const helic: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ['w', 'r', 'g', 'y', 'o', 'b'],
    move: () => true,
    roundParams: [],
  };

  helic.getAllStickers = getAllStickers.bind(helic);

  const PI = Math.PI;
  const PI23 = PI * 2 / 3;
  const PI_2 = PI / 2;

  let pieces = helic.pieces;
  let anchor = UP.add(BACK).add(LEFT);

  // Corners
  let cornerSticker = new Sticker([
    UP.add(BACK),
    UP.add(BACK).add(LEFT),
    UP.add(LEFT)
  ], '', [UP.add(BACK), UP.add(LEFT), LEFT.add(BACK)]);

  let cornerPiece = new Piece([0, 1, 2].map(n => cornerSticker.rotateBundle(CENTER, anchor, PI23 * n)));

  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n)));
  pieces.push(...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n).rotate(CENTER, FRONT, PI)));

  // Edges
  let edgePiece = new Piece([
    new Sticker([ UP, UP.add(BACK), UP.add(LEFT) ], '', [UP.add(BACK), UP.add(LEFT)])
  ]);

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n)));
  
  [FRONT, RIGHT, BACK, LEFT].forEach(v => {
    pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n).rotate(CENTER, v, PI_2, true)));
  });

  pieces.push(...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n).rotate(CENTER, RIGHT, PI, true)));

  // let trySingleMove = (mv: any): { pieces: Piece[], u: Vector3D, ang: number } | null => {
  //   let moveId = mv[0];
  //   let turns = mv[1];
  //   const pts1 = planes[moveId].map(e => e.clone());
  //   const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
  //   const anc = pts1[0].add(u.mul(-(mv[3] || 0) * 0));
  //   const ang = 0 * turns;

  //   let pcs = [];

  //   for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
  //     let d = pieces[i].direction1(anc, u, true);

  //     if (d === 0) {
  //       console.log("Invalid move. Piece intersection detected.", mv, turns, mv);
  //       console.log("Piece: ", i, pieces[i], pts1);
  //       return null;
  //     }

  //     if (d * mv[2] > 0) {
  //       pcs.push(pieces[i]);
  //     }
  //   }

  //   return {
  //     pieces: pcs,
  //     u,
  //     ang
  //   };
  // };

  // Scramble handlers
  let planes: Vector3D[][] = [
    [UP, UP.add(FRONT), RIGHT.add(FRONT)], // UR
    [UP, UP.add(LEFT), FRONT.add(LEFT)], // UF
    [UP, UP.add(BACK), LEFT.add(BACK)], // UL
    [UP, UP.add(RIGHT), BACK.add(RIGHT)], // UB
    [DOWN, RIGHT, RIGHT.add(FRONT)], // DR
    [DOWN, FRONT, FRONT.add(LEFT)], // DF
    [DOWN, LEFT, LEFT.add(BACK)], // DL
    [DOWN, BACK, BACK.add(RIGHT)], // DB
    [RIGHT, FRONT, FRONT.add(DOWN)], // FR
    [FRONT, LEFT, LEFT.add(DOWN)], // FL
    [LEFT, BACK, BACK.add(DOWN)], // BL
    [BACK, RIGHT, RIGHT.add(DOWN)], // BR
  ];

  let trySingleMove = (mv: string): { pieces: Piece[], u: Vector3D, ang: number } | null => {
    const moveMap = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

    let moveId = moveMap.indexOf(mv);
    let plane = planes[moveId];
    let u = Vector3D.cross(plane[0], plane[1], plane[2]).unit();
    let pcs = pieces.filter(p => p.direction1(plane[0], u) >= 0);

    return {
      pieces: pcs,
      u,
      ang: PI
    };
  };

  helic.move = function (scramble: any[]) {
    let moves = scramble[0].match(/(UR|UF|UL|UB|DR|DF|DL|DB|FR|FL|BL|BR)/g);

    if ( moves ) {
      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        const pcs = trySingleMove(moves[i]);

        if ( !pcs ) {
          return false;
        }
  
        let { u, ang } = pcs;
        pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
      }
    }

    return true;
  };

  helic.toMove = function (pc: Piece, st: Sticker, u: Vector3D) {
    let mc = st.updateMassCenter();
    let pcs = pieces.filter(p => p.direction1(mc, u) >= 0);

    return {
      pieces: pcs,
      ang: PI,
    };
  };

  helic.scramble = function () {
    if (!helic.toMove) return;
    let scr = utilscramble('heli', 40)!;
    helic.move([scr]);
  };

  helic.applySequence = function (moves: string[]) {
    let res: { u: Vector3D, ang: number, pieces: string[] }[] = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let pcs;

      try {
        pcs = trySingleMove(moves[i]);
      } catch (e) {
        console.log("ERROR: ", moves[i], e);
      }

      if (!pcs) {
        continue;
      }

      let { u, ang } = pcs;
      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return res;
  };

  helic.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  helic.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(helic, helic.faceColors);

  return helic;

}