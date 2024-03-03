import { Vector3D, UP, DOWN, FRONT, CENTER } from '../vector3d';
import { Sticker } from './Sticker';
import { Piece } from './Piece';
import { assignColors, getAllStickers, random } from './puzzleUtils';
import type { PuzzleInterface } from '@interfaces';
import { EPS, STANDARD_PALETTE } from "@constants";

export function PYRAMORPHIX(): PuzzleInterface {
  const n = 2;

  let pyra: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [ 'g', 'b', 'y', 'r' ],
    move: () => true,
    dims: [],
    roundParams: [],
  };

  pyra.getAllStickers = getAllStickers.bind(pyra);

  const PI = Math.PI;
  const PI_2 = PI / 2;
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

  const ANCHORS = [ PU, PR, PB, PL ];

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

    return new Piece([ new Sticker(pts) ]);
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

  let pieces = pyra.pieces;

  let vdirs = [
    Vector3D.cross(PU.add(PL).div(2), PU.add(PR).div(2), PR.add(PB).div(2)).unit(),
    Vector3D.cross(PU.add(PB).div(2), PU.add(PL).div(2), PL.add(PR).div(2)).unit(),
    Vector3D.cross(PL.add(PR).div(2), PU.add(PR).div(2), PU.add(PB).div(2)).unit(),
  ];

  pieces.forEach(p => p.stickers.forEach(s => s.vecs = vdirs.map(v => v.clone())));

  pyra.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) == 0);
    return {
      pieces: toMovePieces,
      ang: PI_2
    };
  };

  pyra.scramble = function() {
    if ( !pyra.toMove ) return;

    const MOVES = 10;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random( pieces ) as Piece;
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = pyra.toMove(p, s, vec);
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
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