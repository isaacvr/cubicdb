import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

export function IVY(): PuzzleInterface {

  const ivy: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: null,
    faceColors: [ 'y', 'o', 'g', 'w', 'r', 'b' ],
    move: () => true,
    roundParams: [],
  };

  ivy.getAllStickers = getAllStickers.bind(ivy);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const ANG = 2 * PI / 3;

  let p1 = LEFT.add(UP).add(BACK);
  // let p2 = LEFT.add(UP).add(FRONT);
  let p3 = RIGHT.add(UP).add(FRONT);
  // let p4 = RIGHT.add(UP).add(BACK);

  let cornerSticker = new Sticker([
    p1,
  ]);

  let curvePoints: Vector3D[] = [];

  for (let i = 0, maxi = 25; i <= maxi; i += 1) {
    let alpha = i / maxi;
    curvePoints.push(
      p3.add( LEFT.mul(2).rotate(CENTER, DOWN, alpha * PI_2) )
    );
  }

  cornerSticker.points.push(...curvePoints.map(e => e.clone()));

  let centerPiece = new Piece([
    new Sticker([
      ...curvePoints.map(e => e.clone()).reverse(),
      ...curvePoints.map((e: Vector3D) => e.rotate(CENTER, UP, PI)).reverse()
    ])
  ]);

  centerPiece.stickers[0].vecs = [ p1.unit(), p3.unit(),
  ];

  centerPiece.stickers[0].points.pop();

  let corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(CENTER, p1, ANG),
    cornerSticker.rotate(CENTER, p1, -ANG)
  ]);

  corner.stickers.forEach(s => s.vecs = [ p1.unit() ]);

  let pieces = ivy.pieces;

  pieces.push(
    corner,
    corner.rotate(CENTER, UP, PI),
    corner.rotate(CENTER, LEFT, PI),
    corner.rotate(CENTER, LEFT, PI).rotate(CENTER, UP, PI),
    centerPiece,
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, RIGHT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, LEFT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, FRONT, PI_2),
    centerPiece.rotate(CENTER, UP, PI_2).rotate(CENTER, BACK, PI_2),
    centerPiece.rotate(CENTER, UP, PI).rotate(CENTER, RIGHT, PI),
  );
  
  ivy.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: ANG
    };
  };

  ivy.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  ivy.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(ivy, ivy.faceColors);
  // roundCorners(ivy, 0.05, 0.97);

  return ivy;

}