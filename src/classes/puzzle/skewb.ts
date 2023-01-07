import { Vector3 } from 'three';
import { RIGHT, LEFT, DOWN, FRONT } from './../vector3d';
import { Vector3D, CENTER, BACK, UP } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';

export function SKEWB(): PuzzleInterface {
  let skewb: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: null,
    faceColors: [ 'w', 'r', 'g', 'y', 'o', 'b' ],
    move: () => true,
    roundParams: [],
  };

  skewb.getAllStickers = getAllStickers.bind(skewb);

  const L = 1;
  const PI = Math.PI;
  const PI_2 = PI / 2;

  let center = new Piece([
    new Sticker([
      UP.add(BACK).mul(L),
      UP.add(LEFT).mul(L),
      UP.add(FRONT).mul(L),
      UP.add(RIGHT).mul(L),
    ])
  ]);

  center.stickers[0].vecs = [
    UP.add( BACK ).add(LEFT).unit(),
    UP.add( BACK ).add(RIGHT).unit(),
    UP.add( FRONT ).add(LEFT).unit(),
    UP.add( FRONT ).add(RIGHT).unit(),
  ];

  let cornerSticker = new Sticker([
    UP.add(RIGHT).mul(L),
    UP.add(FRONT).mul(L),
    UP.add(FRONT).add(RIGHT).mul(L)
  ]);

  let anchor = UP.add(FRONT).add(RIGHT).mul(L);

  let corner = new Piece([
    cornerSticker,
    cornerSticker.rotate(anchor, UP, PI_2).rotate(anchor, RIGHT, PI_2),
    cornerSticker.rotate(anchor, DOWN, PI_2).rotate(anchor, BACK, PI_2),
  ]);

  corner.stickers.forEach(s => {
    s.vecs = [
      UP.add(RIGHT).add(BACK).unit(),
      DOWN.add(RIGHT).add(FRONT).unit(),
      UP.add(LEFT).add(FRONT).unit(),
    ];
  });

  for (let i = 0; i < 4; i += 1) {
    skewb.pieces.push(center.rotate(CENTER, RIGHT, i * PI_2) );
  }
  skewb.pieces.push(center.rotate(CENTER, BACK, PI_2) );
  skewb.pieces.push(center.rotate(CENTER, FRONT, PI_2) );

  for (let i = 0; i <= 1; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      skewb.pieces.push( corner.rotate(CENTER, RIGHT, i * PI_2).rotate(CENTER, UP, j * PI_2) );
    }
  }

  const MOVE_MAP = "URLB";

  let pieces = skewb.pieces;

  let planes = [
    [ RIGHT.add(UP).mul(L), FRONT.add(UP).mul(L), FRONT.add(LEFT).mul(L) ],
    [ BACK.add(UP).mul(L), RIGHT.add(FRONT).mul(L), RIGHT.add(UP).mul(L) ],
    [ RIGHT.add(FRONT).mul(L), LEFT.add(UP).mul(L), UP.add(FRONT).mul(L) ],
    [ LEFT.add(UP).mul(L), RIGHT.add(BACK).mul(L), BACK.add(UP).mul(L) ],
  ];

  skewb.move = function(moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let moveId = mv[0];
      let turns = mv[1];
      const pts1 = planes[moveId];
      const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
      const mu = u.mul(-1);
      const ang = 2 * Math.PI / 3 * turns;

      // let ini = performance.now();
      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let d = pieces[i].direction(pts1[0], pts1[1], pts1[2]);
        if ( d === 0 ) {
          console.log("Invalid move. Piece intersection detected.", MOVE_MAP[moveId], turns, mv);
          console.log("Piece: ", i, pieces[i], pts1);
          return;
        }

        if ( d < 0 ) {
          // pieces[i].stickers = pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang));
          pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang, true));
        }
      }
    }
  };

  skewb.vectorsFromCamera = function(vecs: any[], cam) {
    return vecs.map(e => {
      let vp = new Vector3(e.x, e.y, e.z).project(cam);
      return new Vector3D(vp.x, -vp.y, 0);
    });
  };

  skewb.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: 2 * PI / 3
    };
  };

  skewb.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  skewb.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(skewb, skewb.faceColors);
  // roundCorners(skewb, null, 0.95);

  return skewb;

}