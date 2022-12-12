import { Vector3 } from 'three';
import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, assignVectors, getAllStickers, roundCorners } from './puzzleUtils';

function pc(x, y, z) {
  return LEFT.add(UP).add(BACK).add(
    RIGHT.mul(2 * x / 3).add( DOWN.mul(2 * y / 3) ).add( FRONT.mul(2 * z / 3) )
  );
}

export function BICUBE(): PuzzleInterface {

  const bicube: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: null,
    faceColors: [ 'y', 'g', 'r', 'w', 'b', 'o' ],
    move: () => true
  };

  bicube.getAllStickers = getAllStickers.bind(bicube);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI23 = 2 * PI / 3;

  let pieces = bicube.pieces;
  
  let small = new Piece([
    new Sticker([ pc(2, 0, 2), pc(2, 0, 3), pc(3, 0, 3), pc(3, 0, 2) ]),
    new Sticker([ pc(2, 0, 3), pc(2, 1, 3), pc(3, 1, 3), pc(3, 0, 3) ]),
    new Sticker([ pc(3, 0, 3), pc(3, 1, 3), pc(3, 1, 2), pc(3, 0, 2) ]),
  ]);

  // small.stickers.forEach(s => s.vecs = [ RIGHT, UP, FRONT ].map(e => e.clone()));

  let big = new Piece([
    new Sticker([ pc(0, 0, 0), pc(0, 0, 1), pc(2, 0, 1), pc(2, 0, 0) ]),
    new Sticker([ pc(0, 0, 0), pc(2, 0, 0), pc(2, 1, 0), pc(0, 1, 0) ]),
    new Sticker([ pc(0, 0, 0), pc(0, 1, 0), pc(0, 1, 1), pc(0, 0, 1) ]),
    new Sticker([ pc(0, 0, 1), pc(0, 1, 1), pc(2, 1, 1), pc(2, 0, 1) ]),
  ]);

  // big.stickers.forEach(s => s.vecs = [ UP, BACK ].map(e => e.clone()));

  let big1 = new Piece([
    new Sticker([ pc(1, 1, 0), pc(2, 1, 0), pc(2, 3, 0), pc(1, 3, 0) ]),
    new Sticker([ pc(1, 3, 0), pc(2, 3, 0), pc(2, 3, 2), pc(1, 3, 2) ]),
  ])

  let group = [ big, big.add( FRONT.mul(2 / 3) ), big.add( FRONT.mul(4 / 3) ) ];

  pieces.push( small );
  
  pieces.push( ...group );
  pieces.push( ...group.map(e => e.rotate(CENTER, RIGHT.add(UP).add(FRONT), PI23)) );
  pieces.push( ...group.map(e => e.rotate(CENTER, RIGHT.add(UP).add(FRONT), -PI23)) );
  pieces.push( ...group.map(e => e.rotate(CENTER, FRONT, PI_2)) );
  pieces.pop();
  pieces.push( big1 );

  bicube.vectorsFromCamera = function(vecs: any[], cam) {
    return vecs.map(e => {
      let vp = new Vector3(e.x, e.y, e.z).project(cam);
      return new Vector3D(vp.x, -vp.y, 0);
    });
  };

  bicube.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let ac = dir.unit().toNormal().div(3);
    let intersected = pieces.filter(p => p.direction1(ac, dir) === 0);
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);

    return {
      pieces: intersected.length > 0 ? [] : toMovePieces,
      ang: PI_2
    };
  };

  bicube.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  bicube.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(bicube, bicube.faceColors);
  roundCorners(bicube);
  assignVectors(bicube);

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let st = pieces[i].stickers;
    let f: Sticker;

    while( true ) {
      f = st.find(s => s.color === 'x');

      if ( f ) {
        st.splice( st.indexOf(f), 1 );
        st.splice( st.indexOf(f._generator), 1 );
      } else {
        break;
      }
    }
  }

  return bicube;

}