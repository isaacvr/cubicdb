import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

export function REDI(): PuzzleInterface {

  const redi: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [ 'y', 'o', 'g', 'w', 'r', 'b' ],
    move: () => true,
    dims: [],
    roundParams: [],
  };

  redi.getAllStickers = getAllStickers.bind(redi);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG = 2 * PI / 3;
  const RAD = Math.sqrt(5);
  const R1 = Math.sqrt( (RAD - 1) ** 2 + (-RAD - 1) ** 2 );
  const H = Math.sqrt( R1 ** 2 - RAD ** 2 );
  
  let pieces = redi.pieces;
  let ref = LEFT.add(UP).add(BACK);

  let cornerSticker = new Sticker([
    ref,
    ref.add( FRONT.mul(2/3) ),
    ref.add( FRONT.mul(2/3) ).add( RIGHT.mul(2/3) ),
    ref.add( RIGHT.mul(2/3) ),
  ]);

  cornerSticker.vecs = [ ref.unit() ];

  let corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(ref, ref, 2 * PI / 3),
    cornerSticker.rotate(ref, ref, -2 * PI / 3),
  ]);

  let arrowSticker = new Sticker([
    ref.add( FRONT.mul(2/3) ),
    ref.add( FRONT.mul(4/3) ),
    ref.add( FRONT.mul(4/3) ).add( RIGHT.mul(2/3) ),
    ref.add( FRONT.mul(4/3) ).add( RIGHT ).add( BACK.mul(1/3) ),
    ref.add( FRONT.mul(4/3) ).add( RIGHT.mul(2/3) ).add( BACK.mul(2/3) ),
  ]);

  arrowSticker.vecs = [ ref.unit(), LEFT.add(UP).add(FRONT).unit() ];

  let arrowPiece = new Piece([
    arrowSticker,
    arrowSticker.rotate(LEFT.add(UP), LEFT.add(UP), PI)
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push( corner.rotate(CENTER, UP, PI_2 * i) );
    pieces.push( corner.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI) );
    pieces.push( arrowPiece.rotate(CENTER, UP, PI_2 * i) );
    pieces.push( arrowPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i) );
    pieces.push( arrowPiece.rotate(CENTER, UP, PI_2 * i).rotate(CENTER, FRONT, PI) );
  }

  redi.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {;
    let c = new Vector3D( Math.sign(dir.x) / 2, Math.sign(dir.y) / 2, Math.sign(dir.z) / 2 );
    let toMovePieces = pieces.filter(p => p.direction1(c, dir, true) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG
    };
  };

  redi.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  redi.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(redi, redi.faceColors);  
  // roundCorners(redi);

  return redi;

}