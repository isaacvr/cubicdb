import { UP, BACK, FRONT, CENTER } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

export function ULTIMATE_SKEWB(): PuzzleInterface {

  const uSkewb: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [ "white", "yellow", "violet", "green", "red", "blue", "orange", "lblue", "lyellow", "pink", "lgreen", "gray" ],
    move: () => true,
    roundParams: [],
  };

  const PI = Math.PI;
  const sq = Math.sqrt;
  const F_INT = sq( (50 + 22 * sq(5) ) / 5 ) / 4;
  const F_EXT = sq(6) / 4 * sq(3 + sq(5));
  const R_INT = 1;
  const SIDE = R_INT / F_INT;
  const R_EXT = SIDE * F_EXT;
  const RAD = sq( R_EXT ** 2 - R_INT ** 2 );
  const INNER_ANG = 2 * PI / 5;
  const ANG = 2 * PI / 3;
  
  let anchors: Vector3D[] = [];

  for (let i = 0; i < 5; i += 1) {
    anchors.push( UP.mul(R_INT).add( BACK.mul(RAD).rotate(CENTER, UP, i * INNER_ANG) ) );
  }

  uSkewb.getAllStickers = getAllStickers.bind(uSkewb);

  let mid = (a: number, b: number) => anchors[a].add( anchors[b] ).div(2);

  let u1 = Vector3D.cross( CENTER, mid(0, 4), mid(2, 3));
  let u2 = Vector3D.cross( CENTER, mid(0, 1), mid(4, 3));
  let pieces = uSkewb.pieces;
  let vdir = [
    Vector3D.cross(CENTER, mid(2, 3), mid(0, 4)),
    Vector3D.cross(CENTER, mid(3, 4), mid(0, 1)),
    Vector3D.cross(CENTER, mid(0, 4).reflect(CENTER, mid(1, 1), mid(2, 2)), mid(2, 3).reflect(CENTER, mid(1, 1), mid(2, 2))),
  ];

  let centerPoint = mid(3, 4).add( mid(4, 0) ).sub(anchors[4]);
  let bigSticker = new Sticker([ mid(0, 1), anchors[1], anchors[2], mid(2, 3), centerPoint ], '', vdir);
  let midSticker = new Sticker([ anchors[0], mid(0, 1), centerPoint, mid(0, 4) ], '', [
    vdir[0], vdir[1].mul(-1), vdir[2].reflect(CENTER, anchors[4], mid(1, 2))
  ]);
  
  let bigPiece = new Piece([ bigSticker, bigSticker.rotate(CENTER, mid(1, 2), PI) ]);

  let bst = bigPiece.stickers;

  let smallSticker = new Sticker([
    bst[0].points[0],
    bst[0].points[0].add( bst[1].points[3] ).sub( bst[0].points[1] ),
    bst[1].points[3],
    bst[0].points[1]
  ], '', vdir);

  bigPiece.stickers.push(
    smallSticker,
    smallSticker.reflect1(CENTER, anchors[2].sub(anchors[1]), true)
  );
  bst.forEach(s => s.vecs = vdir.map(v => v.clone()));

  let bigRPiece = bigPiece
    .rotate(CENTER, bigPiece.stickers[1].getOrientation(), INNER_ANG)
    .rotate(CENTER, UP, INNER_ANG * 3);

  let rmidSticker = midSticker.reflect(CENTER, anchors[3], anchors[4], true);
  let smallPiece = new Piece([
    midSticker,
    midSticker.rotate(CENTER, anchors[0], -2 * PI / 3),
    rmidSticker
      .rotate(CENTER, rmidSticker.getOrientation(), INNER_ANG * 2)
      .reflect(CENTER, centerPoint, anchors[4], true)
  ]);
  let smallRPiece = smallPiece.reflect1(CENTER, anchors[2].sub(anchors[1]), true);

  pieces.push(

    ...[0, 1, 2].map(n => bigPiece.rotate(CENTER, u1, ANG * n)),
    ...[0, 1, 2].map(n => bigRPiece.rotate(CENTER, u1, ANG * n)),

    ...[0, 1, 2].map(n => smallPiece.rotate(CENTER, u1, ANG * n)),
    ...[0, 1, 2].map(n => smallRPiece.rotate(CENTER, u1, ANG * n)),

    smallPiece.rotate(CENTER, u2, ANG),
    smallRPiece.rotate(CENTER, u2, -ANG),
  );

  uSkewb.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {;
    let mc = piece.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir, true) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG
    };
  };

  uSkewb.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  uSkewb.faceVectors = [
    bigPiece.stickers[0].getOrientation(),
    ...[0, 1, 2, 3, 4].map(n => bigPiece.stickers[1].rotate(CENTER, UP, INNER_ANG * n).getOrientation())  
  ];

  uSkewb.faceVectors.push(
    ...uSkewb.faceVectors.map(v => v.rotate(CENTER, FRONT, PI).rotate(CENTER, UP, INNER_ANG / 2))
  );

  assignColors(uSkewb, uSkewb.faceColors);  
 
  return uSkewb;

}