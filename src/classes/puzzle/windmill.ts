import { Sticker } from './Sticker';
import { LEFT, UP, BACK, FRONT, RIGHT, CENTER, DOWN } from '../vector3d';
import { STANDARD_PALETTE } from '@constants';
import type { PuzzleInterface } from '@interfaces';
import { Vector3D } from '../vector3d';
import { Piece } from './Piece';
import { assignColors, getAllStickers } from './puzzleUtils';

export function WINDMILL(): PuzzleInterface {

  let windmill: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    getAllStickers: () => [],
    faceColors: [ 'w', 'r', 'g', 'y', 'o', 'b' ],
    move: () => true,
    roundParams: []
  };

  windmill.getAllStickers = getAllStickers.bind(windmill);

  const ANG = 1.0233392882276566;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const D2 = 2 / 3 / Math.sin(ANG);
  const D1 = 2 - D2;
  const L1 = 2 * Math.cos( ANG );
  const L2 = D1 * Math.cos( ANG );
  const anchor = FRONT.add(UP).add(LEFT);
  const anchor1 = anchor.add( RIGHT.mul(D2) );
  const anchor2 = RIGHT.add( UP ).add( FRONT );
  const vdir = new Vector3D( Math.cos(ANG), 0, -Math.sin(ANG) );

  console.log("VDIR: ", vdir);
  
  let pieces = windmill.pieces; 

  let edgePiece = new Piece([
    new Sticker([
      anchor, anchor.add( RIGHT.mul(D2) ),
      anchor1.add( vdir.mul(L2) ),
      anchor.add( vdir.mul(L1) ),
    ]),
    new Sticker([
      anchor, anchor.add( DOWN.mul(2 / 3) ),
      anchor1.add( DOWN.mul(2 / 3) ), anchor1
    ]),
    new Sticker([
      anchor1, anchor1.add( DOWN.mul(2 / 3) ),
      anchor1.add( DOWN.mul(2 / 3) ).add( vdir.mul(L2) ),
      anchor1.add( vdir.mul(L2) ),
    ]),
    new Sticker([
      anchor,
      anchor.add( vdir.mul(L1) ),
      anchor.add( DOWN.mul(2 / 3) ).add( vdir.mul(L1) ),
      anchor.add( DOWN.mul(2 / 3) ),
    ]),
    new Sticker([
      anchor, anchor.add( RIGHT.mul(D2) ),
      anchor1.add( vdir.mul(L2) ),
      anchor.add( vdir.mul(L1) ),
    ]).add( DOWN.mul(2 / 3) ).reverse(),
  ]);

  pieces.push( ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n)) );
  pieces.push( ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n).add( DOWN.mul(2 / 3) )) );
  pieces.push( ...[0, 1, 2, 3].map(n => edgePiece.rotate(CENTER, UP, PI_2 * n).add( DOWN.mul(4 / 3) )) );

  let cornerPiece = new Piece([
    new Sticker([
      anchor1, anchor2, anchor1.add( vdir.mul(L2) )
    ]),
    new Sticker([
      anchor1, anchor1.add( DOWN.mul(2 / 3) ),
      anchor2.add( DOWN.mul(2 / 3) ), anchor2
    ]),
    new Sticker([
      anchor2, anchor2.add( DOWN.mul(2 / 3) ),
      anchor1.add( vdir.mul(L2) ).add( DOWN.mul(2 / 3) ),
      anchor1.add( vdir.mul(L2) )
    ]),
    new Sticker([
      anchor1, anchor1.add( vdir.mul(L2) ),
      anchor1.add( vdir.mul(L2) ).add( DOWN.mul(2 / 3) ),
      anchor1.add( DOWN.mul(2 / 3) )
    ]),
    new Sticker([
      anchor1, anchor2, anchor1.add( vdir.mul(L2) )
    ]).add( DOWN.mul(2 / 3) ).reverse(),
  ]);

  pieces.push( ...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n)) );
  pieces.push( ...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n).add( DOWN.mul(2 / 3) )) );
  pieces.push( ...[0, 1, 2, 3].map(n => cornerPiece.rotate(CENTER, UP, PI_2 * n).add( DOWN.mul(4 / 3) )) );

  let centerSticker = new Sticker([0, 1, 2, 3].map( n => anchor1.add( vdir.mul(L2) ).rotate(CENTER, UP, n * PI_2) ));
  let centerPiece = new Piece([
    centerSticker, centerSticker.add(DOWN.mul( 2 / 3 )).reverse()
  ]);

  pieces.push( centerPiece, centerPiece.reflect1(CENTER, UP, true) );

  pieces.forEach(p => {
    p.stickers.forEach(s => s.vecs = [UP, vdir, vdir.cross(UP)].map(v => v.clone()));
  });

  windmill.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = piece.getMassCenter();
    let pcs = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: pcs,
      ang: PI_2
    };
  };

  windmill.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };
  
  windmill.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(windmill, windmill.faceColors);

  return windmill;

}