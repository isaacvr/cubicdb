import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers, random, roundCorners } from './puzzleUtils';
import { Vector3 } from 'three';

export function MIRROR(n: number): PuzzleInterface {
  const len = 2;

  const mirror: PuzzleInterface = {
    pieces: [],
    palette: Object.assign({ gray: "#E8E8E8" }, STANDARD_PALETTE),
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: null,
    dims: [n, n, n],
    faceColors: [ 'w', 'r', 'g', 'y', 'o', 'b' ],
    move: () => false
  };

  let fc = mirror.faceColors;

  mirror.getAllStickers = getAllStickers.bind(mirror);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [ RIGHT, FRONT, UP ];
  const LENS = [
    [ 22/19, 1, 16/19 ],
    [ 25/19, 1, 13/19 ],
    [ 9/19, 1, 29/19 ],
  ];

  let getFactor = function(axis: number, pos: number): number {
    if (pos < 1) { return LENS[ axis ][0]; }
    if ( pos < n - 1 ) { return LENS[ axis ][1]; }
    return LENS[ axis ][2];
  };

  let getPosition = function(axis: number, pos: number): number {
    if ( pos == 0 ) { return 0; }
    if (pos == 1) { return LENS[ axis ][0]; }
    return LENS[ axis ][0] + (pos - 1) * LENS[ axis ][1];
  };

  for (let z = 0; z < n; z += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if ( x != 0 && y != 0 && z != 0 && x != n - 1 && y != n - 1 && z != n - 1 ) {
          continue;
        }

        let anchor = DOWN.mul( getPosition(2, z) )
          .add( FRONT.mul( getPosition(1, y) ) )
          .add( RIGHT.mul( getPosition(0, x) ) );
        let fx = getFactor(0, x);
        let fy = getFactor(1, y);
        let fz = getFactor(2, z);

        let center = anchor.add( RIGHT.mul(fx).add( FRONT.mul(fy) ).add( DOWN.mul(fz) ).div(2) );

        let p = new Piece();
        let sUp = new Sticker([
          anchor,
          anchor.add( FRONT.mul(fy) ),
          anchor.add( FRONT.mul(fy).add( RIGHT.mul(fx) ) ),
          anchor.add( RIGHT.mul(fx) ),
        ]);

        let sLeft = new Sticker([
          anchor,
          anchor.add( DOWN.mul(fz) ),
          anchor.add( DOWN.mul(fz).add( FRONT.mul(fy) ) ),
          anchor.add( FRONT.mul(fy) ),
        ]);

        let sBack = new Sticker([
          anchor,
          anchor.add( RIGHT.mul(fx) ),
          anchor.add( RIGHT.mul(fx).add( DOWN.mul(fz) ) ),
          anchor.add( DOWN.mul(fz) ),
        ]);

        sUp.vecs = vdir.map(e => e.clone());
        sLeft.vecs = vdir.map(e => e.clone());
        sBack.vecs = vdir.map(e => e.clone());

        p.stickers.push(sUp);
        p.stickers.push(sLeft.rotate(center, UP, PI));
        p.stickers.push(sBack.rotate(center, UP, PI));
        p.stickers.push(sUp.rotate(center, RIGHT, PI));
        p.stickers.push(sLeft);
        p.stickers.push(sBack);

        // if ( p.stickers.length ) {
        if ( p.stickers.length === 1 ) {
          if ( ( z == 0 || z == n - 1 ) && n > 1 ) {
            p.stickers.push( p.stickers[0].rotate(center, RIGHT, PI) );
          } else if ( ( x == 0 || x == n - 1 ) && n > 1 ) {
            p.stickers.push( p.stickers[0].rotate(center, UP, PI) );
          } else if ( ( y == 0 || y == n - 1 ) && n > 1 ) {
            p.stickers.push( p.stickers[0].rotate(center, UP, PI) );
          }
        }
        p.updateMassCenter();
        mirror.pieces.push(p);
        // }
      }
    }
  }

  let pieces = mirror.pieces;

  let computeBoundingBox = function() {
    let bbs = pieces.map(s => s.computeBoundingBox());
    let box = bbs.reduce((ac, p) => {
      return [
        Math.min(ac[0], p[0].x), Math.min(ac[1], p[0].y), Math.min(ac[2], p[0].z),
        Math.max(ac[3], p[1].x), Math.max(ac[4], p[1].y), Math.max(ac[5], p[1].z),
      ]
    }, [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ]);

    return [
      new Vector3D(box[0], box[1], box[2]),
      new Vector3D(box[3], box[4], box[5])
    ];
  };

  let boundingBox = computeBoundingBox();
  let ini = DOWN.mul( getPosition(2, 1) )
    .add( FRONT.mul( getPosition(1, 1) ) )
    .add( RIGHT.mul( getPosition(0, 1) ) );

  let fin = DOWN.mul( getPosition(2, n - 1) )
  .add( FRONT.mul( getPosition(1, n - 1) ) )
  .add( RIGHT.mul( getPosition(0, n - 1) ) );
  
  // console.log("INI_FIN: ", ini, fin);
  mirror.center = ini.add(fin).div(2);

  let c1 = boundingBox[0].add(boundingBox[1]).div(2);

  // console.log( "RANGE: ", computeBoundingBox(pieces));

  pieces.forEach(p => p.sub(c1, true).mul(len / n, true));
  mirror.center.sub(c1, true).mul(len / n, true);
  
  // console.log('CENTER: ', mirror.center, computeBoundingBox());
  
  mirror.vectorsFromCamera = function(vecs: any[], cam) {
    return vecs.map(e => {
      let vp = new Vector3(e.x, e.y, e.z).project(cam);
      return new Vector3D(vp.x, -vp.y, 0);
    });
  };

  mirror.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let st = piece.stickers.find(s => s.color === 'x' && s.normal().cross(dir).abs() < 1e-6);

    if ( !st ) {
      return { pieces: [], ang: PI_2 };
    }

    st = st._generator;
    // console.log("STICKER: ", st, st.normal());
    let ac = st.updateMassCenter().add( st.normal().mul(-0.01) );
    let toMovePieces = pieces.filter(p => p.direction1(ac, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: PI_2
    };
  };

  mirror.scramble = function() {
    const MOVES = 100;
    let dirs = [ UP, DOWN, FRONT, BACK, LEFT, RIGHT ];

    for (let i = 0; i < MOVES; i += 1) {
      let dir = random(dirs);
      let mv = mirror.toMove( random(pieces), null, dir );
      let cant = 1 + random(3);
      mv.pieces.forEach((p: Piece) => p.rotate(mirror.center, dir, mv.ang * cant, true));
    }
  }

  mirror.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  mirror.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(mirror, mirror.faceColors);
  // roundCorners(mirror, null, null, null, null, (s: Sticker) => s.color != 'x');
  roundCorners(mirror);

  pieces.forEach(p => p.stickers.forEach(s => s.color = (!s.color.match(/^[xd]$/)) ? 'gray' : s.color));

  return mirror;

}