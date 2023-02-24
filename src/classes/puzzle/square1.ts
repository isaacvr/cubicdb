import { Piece } from './Piece';
import { RIGHT, LEFT, BACK, UP, FRONT, DOWN } from './../vector3d';
import { Vector3D, CENTER } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

export function SQUARE1(): PuzzleInterface {
  const sq1: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [ 'w', 'b', 'r', 'y', 'g', 'o' ],
    move: () => true,
    roundParams: [null, 0.95],
  };

  sq1.getAllStickers = getAllStickers.bind(sq1);

  const L = 1;
  const L23 = 2 * L / 3;
  const L1 = L * Math.sqrt(2);
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_6 = PI / 6;

  const BIG = L1 * Math.sin( PI_6 ) / Math.sin( 7 * PI / 12 );

  let pieces = sq1.pieces;

  let pieceBig = new Piece([
    new Sticker([
      LEFT.add(BACK).add(UP).mul(L),
      LEFT.add(BACK).add(UP).mul(L).add( FRONT.mul(BIG) ),
      UP.mul(L),
      LEFT.add(BACK).add(UP).mul(L).add( RIGHT.mul(BIG) ),
    ]),
    new Sticker([
      LEFT.add(BACK).add(UP).mul(L),
      LEFT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ),
      LEFT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ).add( FRONT.mul(BIG) ),
      LEFT.add(BACK).add(UP).mul(L).add( FRONT.mul(BIG) ),
    ]),
  ]);

  pieceBig.stickers.push( pieceBig.stickers[0].add( DOWN.mul(L23) ).reverse() );
  pieceBig.stickers.push(
    pieceBig.stickers[1]
    .rotate(LEFT.add(BACK).add(UP).mul(L), DOWN, PI_2)
    .add( RIGHT.mul(BIG) )
    );
    
  let pieceSmall = new Piece([
    new Sticker([
      RIGHT.add(UP).add(BACK).mul(L).add( LEFT.mul(BIG) ),
      RIGHT.add(UP).add(BACK).mul(L).add( LEFT.mul(BIG) ).add( DOWN.mul(L23) ),
      LEFT.add(UP).add(BACK).mul(L).add( RIGHT.mul(BIG) ).add( DOWN.mul(L23) ),
      LEFT.add(UP).add(BACK).mul(L).add( RIGHT.mul(BIG) ),
    ]),
    new Sticker([
      LEFT.add(UP).add(BACK).mul(L).add( RIGHT.mul(BIG) ),
      UP.mul(L),
      RIGHT.add(UP).add(BACK).mul(L).add( LEFT.mul(BIG) ),
    ]),
  ]);

  pieceBig.stickers.forEach(s => { s.vecs = [ UP.clone() ]; });
  pieceSmall.stickers.forEach(s => { s.vecs = [ UP.clone() ]; });
  
  let mid = new Piece([
    new Sticker([
      LEFT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ),
      LEFT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ),
    ]),
    new Sticker([
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
    ]),
    new Sticker([
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      RIGHT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
      RIGHT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
    ]),
    new Sticker([
      RIGHT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
      RIGHT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
      LEFT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ),
    ]),
    new Sticker([
      LEFT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ),
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ),
      LEFT.add(FRONT).add(UP).mul(L).add( DOWN.mul(L23) ).add( RIGHT.mul(BIG) ),
      RIGHT.add(BACK).add(UP).mul(L).add( DOWN.mul(L23) ).add( LEFT.mul(BIG) ),
    ]),
    new Sticker([
      LEFT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ),
      LEFT.add(FRONT).add(DOWN).mul(L).add( UP.mul(L23) ).add( RIGHT.mul(BIG) ),
      RIGHT.add(BACK).add(DOWN).mul(L).add( UP.mul(L23) ).add( LEFT.mul(BIG) ),
    ]).reverse(),
  ]);

  let vdir = mid.stickers[2].getOrientation();

  mid.stickers.forEach(s => {
    s.vecs = [ vdir.mul(-1), UP.clone() ];
  });
  
  for (let i = 0; i < 4; i += 1) {
    pieces.push( pieceSmall.rotate(CENTER, UP, i * PI_2) );
    pieces.push( pieceBig.rotate(CENTER, UP, i * PI_2) );
  }

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    pieces.push( pieces[i].rotate(CENTER, RIGHT, PI) );
  }
  
  pieces.push(mid);
  pieces.push(mid.rotate(CENTER, UP, PI));

  let planes = [
    mid.stickers[2].clone().points,
    pieceBig.stickers[2].clone().points.reverse(),
    mid.stickers[5].clone().points
  ];

  sq1.move = function(moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let moveId = mv[0]; // 2
      let turns = mv[1]; // 3
      const pts1 = planes[moveId];
      const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
      const mu = u.mul(-1);
      const ang = PI_6 * turns;

      let buff = [];

      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let d = pieces[i].direction(pts1[0], pts1[1], pts1[2], false, (x: Sticker) => x.color != 'x' && x.color != 'd');

        if ( d === 0 ) {
          console.log("Invalid move. Piece intersection detected.", m, "/UD"[moveId], turns, mv);
          console.log("Piece: ", i, pieces[i], pts1);
          return false;
        }

        if ( d > 0 ) {
          buff.push( pieces[i] );
          // pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang, true));
        }
      }

      buff.forEach(p => p.stickers.map(s => s.rotate(CENTER, mu, ang, true)));
    }
    return true;
  };

  sq1.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let ang = (sticker.vecs[0].cross( UP ).abs() < 1e-6) ? PI_6 : PI;
    let toMovePieces: Piece[] = [];

    if ( ang > PI_6 && dir.cross(UP).abs() > 1e-6 ) {
      if ( sq1.move( [ [0, 6] ] ) ) {
        sq1.move( [ [0, 6] ] );
        toMovePieces = pieces.filter(p => p.direction1(dir.mul(0.06), dir) === 0);
      }
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

  sq1.rotation = {
    x: PI_6,
    y: -PI_6,
    z: 0,
  };

  sq1.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(sq1, sq1.faceColors);

  return sq1;

}