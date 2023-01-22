import { Piece } from './Piece';
import { RIGHT, LEFT, BACK, UP, FRONT, DOWN } from './../vector3d';
import { Vector3D, CENTER } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

function its(a: Vector3D, b: Vector3D, axis: string): Vector3D {
  let ini = 0;
  let fin = 1;
  let mid;

  for (let i = 1; i <= 50; i += 1) {
    mid = (ini + fin) / 2;
    let pt = a.add( b.sub(a).mul(mid) );
    ( Math.abs(pt[ axis ]) < 1 ) ? ini = mid : fin = mid;
  }

  return a.add( b.sub(a).mul(mid) );
}

export function SQUARE2(): PuzzleInterface {
  const sq2: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: null,
    faceColors: [ 'w', 'b', 'r', 'y', 'g', 'o' ],
    move: () => true,
    roundParams: [],
  };

  sq2.getAllStickers = getAllStickers.bind(sq2);

  let pieces = sq2.pieces;

  const L = 1;
  const L23 = 2 * L / 3;
  const L1 = 2 * L * Math.sqrt(2) / 2;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_6 = PI / 6;

  const BIG = L1 * Math.sin( PI_6 ) / Math.sin( 7 * PI / 12 );

  let PTS: Vector3D[] = [];
  let LB = LEFT.add(BACK);
  let LF = LEFT.add(FRONT);
  let RF = RIGHT.add(FRONT);
  let RB = RIGHT.add(BACK);

  let LBU = LB.add(UP);
  let LBD = LB.add(DOWN);
  let RBU = RB.add(UP);
  let RBD = RB.add(DOWN);
  let LFU = LF.add(UP);
  let LFD = LF.add(DOWN);
  let RFU = RF.add(UP);
  let RFD = RF.add(DOWN);

  for (let i = 0; i < 3; i += 1) {
    PTS.push( its( CENTER, LB.rotate(CENTER, UP, PI_6 * i), 'x').add(UP) );
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push( its( CENTER, LF.rotate(CENTER, UP, PI_6 * i), 'z').add(UP) );
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push( its( CENTER, RF.rotate(CENTER, UP, PI_6 * i), 'x').add(UP) );
  }

  for (let i = 0; i < 3; i += 1) {
    PTS.push( its( CENTER, RB.rotate(CENTER, UP, PI_6 * i), 'z').add(UP) );
  }

  for (let i = 0, maxi = PTS.length; i < maxi; i += 1) {
    let p1 = PTS[i];
    let p2 = PTS[ (i + 1) % maxi ];
    let pc = new Piece([
      new Sticker([ CENTER.add(UP), p1, p2, ]),
      new Sticker([ CENTER.add(UP), p1, p2, ]).add( DOWN.mul(2 / 3), true).reverse(true),
      new Sticker([ p1, p1.add( DOWN.mul(2 / 3) ), p2.add( DOWN.mul(2 / 3) ), p2 ], null, [
        UP.clone()
      ]),
      new Sticker([ CENTER.add(UP), p2, p2.add( DOWN.mul(2 / 3) ), CENTER.add( UP.div(3) ) ]),
      new Sticker([ CENTER.add(UP), CENTER.add( UP.div(3) ), p1.add( DOWN.mul(2 / 3) ), p1 ]),
    ]);

    pieces.push( pc );
    pieces.push( pc.rotate(CENTER, RIGHT, PI) );
  }
  
  let mid = new Piece([
    new Sticker([
      LBU.add( DOWN.mul(L23) ), LBD.add( UP.mul(L23) ),
      LFD.add( UP.mul(L23) ), LFU.add( DOWN.mul(L23) ),
    ]),
    new Sticker([
      LFU.add( DOWN.mul(L23) ), LFD.add( UP.mul(L23) ),
      LFD.add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      LFU.add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
    ]),
    new Sticker([
      LFU.add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
      LFD.add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      RBD.add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
      RBU.add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
    ]),
    new Sticker([
      RBU.add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
      RBD.add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
      LBD.add( UP.mul(L23) ), LBU.add( DOWN.mul(L23) ),
    ]),
    new Sticker([
      LBU.add( DOWN.mul(L23) ), LFU.add( DOWN.mul(L23) ),
      LFU.add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
      RBU.add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
    ]),
    new Sticker([
      LBD.add( UP.mul(L23) ), LFD.add( UP.mul(L23) ),
      LFD.add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      RBD.add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
    ]).reverse(),
  ]);

  let vdir = mid.stickers[2].getOrientation();

  mid.stickers.forEach(s => {
    s.vecs = [ vdir.mul(-1), UP.clone() ];
  });
  
  pieces.push(mid);
  pieces.push(mid.rotate(CENTER, UP, PI));

  sq2.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let ang = (sticker.vecs[0].cross( UP ).abs() < 1e-6) ? PI_6 : PI;
    let toMovePieces = [];

    if ( ang > PI_6 && dir.cross(UP).abs() > 1e-6 ) {
      toMovePieces = pieces.filter(p => p.direction1(dir.mul(0.06), dir) === 0);
    } else {
      let mc = sticker.updateMassCenter();
      let isBig = ang > PI_6;
      toMovePieces = pieces.filter(p => {
        return isBig ? p.direction1(mc, dir) === 0 : p.direction1(mc, dir) >= 0
      });
    }

    return {
      pieces: toMovePieces,
      ang
    };
  };

  sq2.rotation = {
    x: PI_6,
    y: -PI_6,
    z: 0,
  };

  sq2.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(sq2, sq2.faceColors);
  // roundCorners(sq2, null, 0.95);

  return sq2;

}