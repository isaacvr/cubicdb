import { UP, BACK, CENTER, RIGHT } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';
// import { planeLineIntersection } from '@helpers/math';

export function PYRAMINX_CRYSTAL(): PuzzleInterface {

  const pCrystal: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: CENTER,
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
  const RATIO = 0.276393202250021;
  const PLANE_NORM = 0.4472135954999585;
  
  let anchors: Vector3D[] = [];
  let getRatio = (from: Vector3D, to: Vector3D) => from.add(to.sub(from).mul(RATIO));

  for (let i = 0; i < 5; i += 1) {
    anchors.push( UP.mul(R_INT).add( BACK.mul(RAD).rotate(CENTER, UP, i * INNER_ANG) ) );
  }

  // Helper to find the RATIO and PLANE_NORM
  let topFace = new Sticker(anchors);
  // let sideFace = topFace.rotate(CENTER, anchors[3], ANG);

  let topCenter = topFace.getMassCenter();
  // let sideCenter = sideFace.getMassCenter();
  // let inters = planeLineIntersection(sideCenter, UP, sideFace.points[2], sideFace.points[2].sub(sideFace.points[3]));

  // console.log("LENGHTS", inters.sub(sideFace.points[2]).abs(), inters.sub(sideFace.points[3]).abs());
  // console.log("PLANE_NORM", topCenter.rotate(CENTER, anchors[0], ANG));

  pCrystal.getAllStickers = getAllStickers.bind(pCrystal);


  let pieces = pCrystal.pieces;
  let vdir = [
    UP,
    ...[0, 1, 2].map(n => topCenter.rotate(CENTER, anchors[n], ANG))
  ];

  // Corners
  let cornerSticker = new Sticker([
    getRatio(anchors[0], anchors[4]), anchors[0],
    getRatio(anchors[0], anchors[1]), topCenter
  ], '', vdir.slice(0, 3));

  let cornerPiece = new Piece([
    ...[0, 1, 2].map(n => cornerSticker.rotate(CENTER, anchors[0], ANG * n))
  ]);

  let topCorners = [0, 1, 2, 3, 4].map(n => cornerPiece.rotate(CENTER, UP, INNER_ANG * n));

  let fv = pCrystal.faceVectors = [
    UP, ...topCorners.map(c => c.stickers[2].getOrientation())
  ];

  fv.push( ...pCrystal.faceVectors.slice().map(v => v.rotate(CENTER, RIGHT, PI)) );

  pieces.push(...topCorners);
  pieces.push(...topCorners.map(c => c.rotate(CENTER, RIGHT, PI)));

  let midCorners = topCorners.reduce((acc: Piece[], tc, v) =>
    [...acc, ...[1, 2].map(n => tc.rotate(CENTER, fv[v + 1], INNER_ANG * n))],
  []);
  
  pieces.push(...midCorners);

  // Edges
  let topSticker = new Sticker([
    getRatio(anchors[0], anchors[1]),
    getRatio(anchors[1], anchors[0]),
    topCenter
  ], '', vdir);

  let topEdge = new Piece([
    topSticker,
    topSticker.reflect1(CENTER, Vector3D.cross(
      CENTER, anchors[0], anchors[1]
    ), true)
  ]);
  
  let topEdges = [0, 1, 2, 3, 4].map(n => topEdge.rotate(CENTER, UP, INNER_ANG * n));
  let bottomEdges = topEdges.map(e => e.rotate(CENTER, RIGHT, PI));

  pieces.push( ...topEdges, ...bottomEdges );

  let midTopEdges = topEdges.reduce((acc: Piece[], te, v) =>
    [...acc, ...[1, 2, 3].map(n => te.rotate(CENTER, fv[v + 1], INNER_ANG * n))],
  []);

  pieces.push(...midTopEdges);
  pieces.push(...topEdges.map((e, v) => e
    .rotate(CENTER, fv[v + 1], INNER_ANG)
    .reflect1(CENTER, UP, true)
    .rotate(CENTER, UP, INNER_ANG / 2)
  ));

  assignColors(pCrystal, pCrystal.faceColors);

  pCrystal.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {;
    // let mc = sticker.updateMassCenter();
    let mc = dir.unit().mul( PLANE_NORM );
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir, true) >= 0);

    return {
      pieces: toMovePieces,
      ang: INNER_ANG
    };
  };

  pCrystal.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  
 
  return pCrystal;

}