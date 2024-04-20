import { Piece } from './Piece';
import { RIGHT, LEFT, BACK, UP, FRONT, DOWN } from './../vector3d';
import { Vector3D, CENTER } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { EPS, STANDARD_PALETTE } from "@constants";
import { Sticker } from './Sticker';
import { assignColors, getAllStickers } from './puzzleUtils';
import { square1SolverGetRandomScramble } from '@cstimer/scramble/scramble_sq1';
import { ScrambleParser } from '@classes/scramble-parser';
import { FaceSticker } from './FaceSticker';
import { utilscramble } from '@cstimer/scramble/utilscramble';

export function SUPER_SQUARE1(): PuzzleInterface {
  const edgePoint = (p: Vector3D) => [p.x, p.y, p.z].reduce((acc, n) =>
    [-1, 0, 1].some(d => Math.abs(d - n) < EPS) ? acc + 1 : acc, 0);

  const sq1: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ['w', 'b', 'r', 'y', 'g', 'o'],
    move: () => true,
    roundParams: [(s: Sticker, i: number) => {
      if (s.name === 'center' && (i === 1 || i === 3)) return [1];
      return 0.11;
    }],
  };

  sq1.getAllStickers = getAllStickers.bind(sq1);

  const L24 = 2 / 4;
  const L1 = Math.sqrt(2);
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_4 = PI / 4;
  const PI_6 = PI / 6;
  const RAD = 0.5;

  const BIG = L1 * Math.sin(PI_6) / Math.sin(7 * PI / 12);

  let pieces = sq1.pieces;
  let DV = LEFT.add(BACK).add(FRONT.mul(BIG)).setLength(1).mul(RAD);
  let CURVE_PTS = 10;

  // Corner
  let pieceBig = new Piece([
    new Sticker([
      LEFT.add(BACK).add(UP),
      LEFT.add(BACK).add(UP).add(FRONT.mul(BIG)),
      ...(new Array(CURVE_PTS).fill(0).map((_, n) => UP.add(DV.rotate(CENTER, DOWN, PI_6 * n * 2 / (CURVE_PTS - 1))))),
      LEFT.add(BACK).add(UP).add(RIGHT.mul(BIG)),
    ]),
    new Sticker([
      LEFT.add(BACK).add(UP),
      LEFT.add(BACK).add(UP).add(DOWN.mul(L24)),
      LEFT.add(BACK).add(UP).add(DOWN.mul(L24)).add(FRONT.mul(BIG)),
      LEFT.add(BACK).add(UP).add(FRONT.mul(BIG)),
    ], undefined, [], false, 'side-corner'),
  ]);

  pieceBig.stickers.push(pieceBig.stickers[0].add(DOWN.mul(L24)).reverse());
  pieceBig.stickers.push(
    pieceBig.stickers[1].reflect1(CENTER, Vector3D.cross(CENTER, LEFT.add(BACK), LEFT.add(BACK).add(UP)), true)
  );

  // Edge
  let pieceSmall = new Piece([
    new Sticker([
      RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)),
      RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)).add(DOWN.mul(L24)),
      LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)).add(DOWN.mul(L24)),
      LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)),
    ], undefined, [], false, 'side-edge'),
    new Sticker([
      LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)),
      ...(new Array(CURVE_PTS).fill(0).map((_, n) => UP.add(DV.rotate(CENTER, DOWN, PI_6 * 2 + PI_6 * n / (CURVE_PTS - 1))))),
      RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)),
    ]),
    new Sticker([
      LEFT.add(UP).add(BACK).add(RIGHT.mul(BIG)),
      ...(new Array(CURVE_PTS).fill(0).map((_, n) => UP.add(DV.rotate(CENTER, DOWN, PI_6 * 2 + PI_6 * n / (CURVE_PTS - 1))))),
      RIGHT.add(UP).add(BACK).add(LEFT.mul(BIG)),
    ]).reverse().add(DOWN.mul(0.5), true),
  ]);

  let slidePlane = [
    LEFT.add(FRONT).add(UP).add(DOWN.mul(L24)).add(RIGHT.mul(BIG)),
    LEFT.add(FRONT).add(DOWN).add(UP.mul(L24)).add(RIGHT.mul(BIG)),
    RIGHT.add(BACK).add(DOWN).add(UP.mul(L24)).add(LEFT.mul(BIG))
  ];

  let vdir = Vector3D.cross(slidePlane[0], slidePlane[1], slidePlane[2]).unit();
  let vec = vdir.mul(-1);

  vdir.setConstant(true);
  vec.setConstant(true);

  pieceBig.stickers.forEach(s => { s.vecs = [vec.clone(), UP.clone()]; });
  pieceSmall.stickers.forEach(s => { s.vecs = [vec.clone(), UP.clone()]; });

  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      pieces.push(pieceSmall.rotate(CENTER, UP, i * PI_2).add(DOWN.mul(j * L24), true));
      pieces.push(pieceBig.rotate(CENTER, UP, i * PI_2).add(DOWN.mul(j * L24), true));
    }
  }

  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      pieces.push(pieceSmall.rotate(CENTER, UP, i * PI_2).rotate(CENTER, FRONT, PI, true).add(UP.mul(j * L24)));
      pieces.push(pieceBig.rotate(CENTER, UP, i * PI_2).rotate(CENTER, FRONT, PI, true).add(UP.mul(j * L24)));
    }
  }

  // Center
  let centerAnchor = DV.rotate(CENTER, DOWN, PI_6 * 9);

  let centerPiece = new Piece([new Sticker([
    UP.add(centerAnchor.rotate(CENTER, DOWN, PI)),
    UP.add(centerAnchor.rotate(CENTER, DOWN, PI - PI_4).mul(Math.SQRT2, true)),
    UP.add(centerAnchor.rotate(CENTER, DOWN, PI_2)),
    UP.add(centerAnchor.rotate(CENTER, DOWN, PI_4).mul(Math.SQRT2, true)),
    UP.add(centerAnchor),
  ], '', [], false, 'center')]);

  pieces.push(centerPiece);
  pieces.push(centerPiece.rotate(CENTER, UP, PI));
  pieces.push(centerPiece.rotate(CENTER, vec, PI));
  pieces.push(centerPiece.rotate(CENTER, UP, PI).rotate(CENTER, vec, PI));

  let planes = [
    slidePlane.map(v => v.clone()), // /
    pieceBig.stickers[2].points.map(p => p.clone().add(UP.mul(.25))).reverse(), // up1
    pieceBig.stickers[2].points.map(p => p.clone().add(DOWN.mul(.25))).reverse(), // up2
    pieceBig.stickers[2].points.map(p => p.clone().add(DOWN.mul(.75))), // down2
    pieceBig.stickers[2].points.map(p => p.clone().add(DOWN.mul(1.25))), // down1
  ];

  let trySingleMove = (mv: any): { pieces: Piece[], u: Vector3D, ang: number } | null => {
    let moveId = mv[0]; // 2
    let turns = mv[1]; // 3
    const pts1 = planes[moveId];
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const mu = u.mul(-1);
    const ang = PI_6 * turns;

    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(pts1[0], u, false, (x: Sticker) => !/^[xd]$/.test(x.color));

      if ((!moveId && d > 0) || (moveId && d === 0)) {
        pcs.push(pieces[i]);
        continue;
      }

      if (!moveId && d === 0) {
        console.log("Invalid move. Piece intersection detected.", "/UD"[moveId], turns, mv);
        console.log("Piece: ", i, pieces[i], pts1);
        return null;
      }
    }

    return {
      pieces: pcs,
      u: mu,
      ang
    };
  };

  sq1.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      let { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }
    return true;
  };

  sq1.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let ang = dir.cross(UP).abs() < EPS ? PI_6 : PI;
    let toMovePieces: Piece[] = [];
    let u = dir;
    let mc = sticker.getMassCenter();

    if (ang > PI_6) {
      if (sq1.move([[0, 6]])) {
        sq1.move([[0, 6]]);
        u = vec.dot(mc) > 0 ? vec : vdir;
        toMovePieces = pieces.filter(p => p.direction1(CENTER, u) >= 0);
      }
    } else {
      let mc = sticker.updateMassCenter();
      toMovePieces = pieces.filter(p => {
        return p.direction1(mc, dir) === 0
      });
    }

    return {
      pieces: toMovePieces,
      ang,
      dir: u.clone()
    };
  };

  sq1.scramble = function () {
    let scramble = ScrambleParser.parseSuperSquare1(utilscramble('ssq1t', 20)!);
    // let scramble = ScrambleParser.parseSuperSquare1("/ (6,6,0,0) / (6,6,0,0) / (6,6,0,0)");
    sq1.move(scramble);
  };

  sq1.applySequence = function (seq: string[]) {
    let moves = seq.reduce((acc: number[][], mv) => [...acc, ...ScrambleParser.parseSquare1(mv)], []);
    let res: { u: Vector3D, ang: number, pieces: string[] }[] = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let pcs;
      let mv = moves[i];

      try {
        pcs = trySingleMove(mv);
      } catch (e) {
        console.log("ERROR: ", seq[i], mv, e);
      }

      if (!pcs) {
        continue;
      }

      let { u, ang } = pcs;

      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return res;
  };

  sq1.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  sq1.rotation = {
    x: PI_6,
    y: -PI_6,
    z: 0,
  };

  assignColors(sq1, sq1.faceColors);

  pieces.forEach(p => p.stickers.forEach(s => s.color === 'x' && (s.vecs = [])));

  return sq1;

}