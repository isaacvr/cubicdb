import { Vector3 } from 'three';
import { Vector3D, UP, DOWN, FRONT, CENTER } from '../vector3d';
import { Sticker } from './Sticker';
import { Piece } from './Piece';
import { assignColors, getAllStickers } from './puzzleUtils';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";

export function PYRAMINX(n: number): PuzzleInterface {
  let pyra: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: null,
    faceColors: [ 'g', 'b', 'y', 'r' ],
    move: () => true,
    dims: [],
    roundParams: [],
  };

  pyra.getAllStickers = getAllStickers.bind(pyra);

  const PI = Math.PI;
  const PI_3 = PI / 3;
  const L = 2.6;
  const V = L / Math.sqrt(3);
  const H = Math.sqrt(L ** 2 - V ** 2);
  const R = Math.sqrt(6) * L / 12;
  let PU = UP.mul( H - R );
  let PR = DOWN.mul(R).add( FRONT.mul(V) ).rotate(CENTER, UP, PI_3);
  let PB = PR.rotate(CENTER, UP, 2 * PI_3);
  let PL = PB.rotate(CENTER, UP, 2 * PI_3);

  pyra.pieces = [];

  const ANCHORS = [
    PU, PR, PB, PL
  ];

  /// front, right, down, left

  const UNITS = [
    [ PL.sub(PU).div(n), PR.sub(PL).div(n) ], // front
    [ PB.sub(PR).div(n), PU.sub(PB).div(n) ], // right (back)
    [ PR.sub(PB).div(n), PL.sub(PR).div(n) ], // down
    [ PU.sub(PL).div(n), PB.sub(PU).div(n) ], // left (back)
  ];

  pyra.faceVectors = [
    UNITS[0][0].cross( UNITS[0][1] ).unit(),
    UNITS[1][0].cross( UNITS[1][1] ).unit(),
    UNITS[2][0].cross( UNITS[2][1] ).unit(),
    UNITS[3][0].cross( UNITS[3][1] ).unit(),
  ];

  let createPiece = function(v1: Vector3D, v2: Vector3D, v3: Vector3D): Piece {
    let pts = [ v1, v2, v3 ];
    let v = pts[2].sub(pts[1]).cross( pts[1].sub(pts[0]) ).unit().mul( H / n );
    let c = pts.reduce((ac, v) => ac.add(v), new Vector3D(0, 0, 0)).div(3).add(v);

    return new Piece([
      new Sticker(pts),
      new Sticker([
        c, c, c
      ]),
    ]);
  };

  for (let f = 0; f < 4; f += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        pyra.pieces.push( createPiece(
          ANCHORS[f].add( UNITS[f][0].mul(i).add( UNITS[f][1].mul(j) ) ),
          ANCHORS[f].add( UNITS[f][0].mul(i + 1).add( UNITS[f][1].mul(j) ) ),
          ANCHORS[f].add( UNITS[f][0].mul(i + 1).add( UNITS[f][1].mul(j + 1) ) ),
        ) );

        if ( j < i ) {
          pyra.pieces.push( createPiece(
            ANCHORS[f].add( UNITS[f][0].mul(i).add( UNITS[f][1].mul(j) ) ),
            ANCHORS[f].add( UNITS[f][0].mul(i + 1).add( UNITS[f][1].mul(j + 1) ) ),
            ANCHORS[f].add( UNITS[f][0].mul(i).add( UNITS[f][1].mul(j + 1) ) ),
          ) );
        }
      }
    }
  }

  const MOVE_MAP = "URLB";

  let pieces = pyra.pieces;

  let planes = [
    [ PL, PB, PR ],
    [ PL, PU, PB ],
    [ PR, PB, PU ],
    [ PR, PU, PL ],
  ];

  let len = PU.sub(PL).div(n).y;

  pieces.forEach(p => p.stickers.forEach(s => s.vecs = pyra.faceVectors.map(v => v.clone())));
  
  /// [ id, turns, -3?, layers ]
  pyra.move = function(moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let moveId = mv[0];
      let layers = mv[3];
      let turns = mv[1];
      const pts1 = planes[moveId];
      const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
      const mu = u.mul(-1);
      const pts2 = pts1.map(p => p.add( mu.mul(len * layers) ));
      const ang = 2 * Math.PI / 3 * turns;

      // let ini = performance.now();
      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let d = pieces[i].direction(pts2[0], pts2[1], pts2[2]);
        if ( d === 0 ) {
          console.log("Invalid move. Piece intersection detected.", MOVE_MAP[moveId], turns, mv);
          console.log("Piece: ", i, pieces[i], pts2);
          return false;
        }

        if ( d < 0 ) {
          // pieces[i].stickers = pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang));
          pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang, true));
        }
      }
    }
    return true;
  };

  pyra.vectorsFromCamera = function(vecs: any[], cam) {
    return vecs.map(e => {
      let vp = new Vector3(e.x, e.y, e.z).project(cam);
      return new Vector3D(vp.x, -vp.y, 0);
    });
  };

  pyra.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: 2 * PI / 3
    };
  };

  assignColors(pyra, pyra.faceColors);
  // roundCorners(pyra);

  // Initial rotation
  pyra.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  return pyra;

}