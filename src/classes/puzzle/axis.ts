// Distortion at 330+ moves

import { Sticker } from "./Sticker";
import { LEFT, UP, BACK, FRONT, RIGHT, CENTER, DOWN } from "./../vector3d";
import { EPS, STANDARD_PALETTE } from "@constants";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { Vector3D } from "../vector3d";
import { Piece } from "./Piece";
import { assignColors, getAllStickers, random } from "./puzzleUtils";

export function AXIS(): PuzzleInterface {
  let axis: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    getAllStickers: () => [],
    faceColors: ["y", "o", "g", "w", "r", "b"],
    move: () => true,
    roundParams: [],
  };

  axis.getAllStickers = getAllStickers.bind(axis);

  const L = 1;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [
    BACK.add(UP)
      .cross(LEFT.add(FRONT.div(2)))
      .unit(),
    FRONT.add(RIGHT)
      .cross(DOWN.add(BACK.div(2)))
      .unit(),
    BACK.add(RIGHT.div(2)).cross(DOWN.add(LEFT)).unit(),
  ];

  let A = UP.add(FRONT).mul(L);
  let B = RIGHT.add(UP).add(BACK).mul(L);

  let AB = Math.sqrt(L ** 2 + (L / 2) ** 2);

  let alpha = PI / 4;
  let beta = Math.asin(L / 2 / AB);
  let gamma = alpha + beta;

  let AC = (L * Math.sin(alpha)) / Math.sin(gamma);

  let C = A.add(B.sub(A).unit().mul(AC));
  let F = LEFT.add(UP).add(BACK).mul(L);
  let G = LEFT.add(UP).add(FRONT).mul(L);
  let H = RIGHT.add(UP).add(FRONT).mul(L);

  let D = F.add(G).div(2);
  let E = D.add(B.sub(D).unit().mul(AC));
  let E1 = E.rotate(CENTER, DOWN, PI_2).rotate(CENTER, FRONT, PI_2);

  let DEF = new Sticker([F, D, E]);
  let BCE = new Sticker([B, E, C]);
  let ACDE = new Sticker([E, D, A, C]);
  let BCH = new Sticker([B, C, H]);
  let ADG = new Sticker([D, G, A]);
  let ACH = new Sticker([C, A, H]);

  let plane1 = [A, B, A.rotate(G, BACK, PI_2)];
  let plane2 = [B, D, D.rotate(G, LEFT, PI_2)];

  let FH = F.project(plane1[0], plane1[1], plane1[2]);
  let DH = D.project(plane1[0], plane1[1], plane1[2]);
  let EH = E.project(plane1[0], plane1[1], plane1[2]);
  let EH1 = E1.project(plane1[0], plane1[1], plane1[2]);
  let CH = C.project(plane2[0], plane2[1], plane2[2]);
  let AH = A.project(plane2[0], plane2[1], plane2[2]);

  let stCornerBig = new Sticker([A, AH, DH, D]);

  let cornerBig = new Piece([
    ADG,
    ADG.rotate(G, G, (2 * PI) / 3),
    ADG.rotate(G, G, (-2 * PI) / 3),
    new Sticker([A, A.rotate(G, BACK, PI_2), D]),
    stCornerBig,
    stCornerBig.rotate(G, G, (2 * PI) / 3),
    stCornerBig.rotate(G, G, (-2 * PI) / 3),
  ]);

  let centerPiece = new Piece([
    DEF,
    ACH.rotate(CENTER, UP, PI_2).rotate(CENTER, FRONT, PI_2),
    new Sticker([F, E, EH, FH]),
    new Sticker([E, D, DH, EH]),
    new Sticker([D, E1, EH1, DH]),
    new Sticker([E1, F, FH, EH1]),
  ]);

  let edgeSmall = new Piece([
    ACDE,
    new Sticker([E, D, DH, EH]),
    new Sticker([E, C, CH, EH]),
    new Sticker([C, A, AH, CH]),
    new Sticker([A, D, DH, AH]),
  ]);

  let cornerSmall = new Piece([
    BCE,
    new Sticker([B, EH, E]),
    new Sticker([C, E, EH, CH]),
    new Sticker([B, C, CH]),
  ]);

  let edge1 = new Piece([
    BCH,
    new Sticker([C, B, CH]),
    centerPiece.stickers[5].rotate(G, G, (-PI * 2) / 3),
  ]);

  edge1.stickers.push(...edge1.rotate(CENTER, B.add(H).div(2), PI).stickers);

  let pieces = axis.pieces;

  pieces.push(cornerBig);
  pieces.push(centerPiece);
  pieces.push(edgeSmall);
  pieces.push(cornerSmall);
  pieces.push(edge1);
  pieces.push(edge1.reflect(G, B, CENTER).reverse());

  for (let i = 1, maxi = pieces.length; i < maxi; i += 1) {
    pieces.push(pieces[i].rotate(G, G, (-PI * 2) / 3));
    pieces.push(pieces[i].rotate(G, G, (PI * 2) / 3));
  }

  for (let i = 0, maxi = 5; i < maxi; i += 1) {
    pieces.push(pieces[i].rotate(CENTER, UP, PI).rotate(CENTER, LEFT, PI_2));
  }

  for (let i = 6, maxi = 12; i < maxi; i += 1) {
    pieces.push(pieces[i].rotate(CENTER, UP, PI).rotate(CENTER, LEFT, PI_2));
  }

  pieces.forEach(p => p.stickers.forEach(s => (s.vecs = vdir.map(e => e.clone()))));

  axis.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let nDir = dir;

    if (!vdir.some(v => v.sub(dir).abs() < EPS) && !vdir.some(v => v.add(dir).abs() < EPS)) {
      let vdirs = [...vdir, ...vdir.map(v => v.mul(-1))];
      vdirs.sort((a, b) => a.sub(dir).abs() - b.sub(dir).abs());
      nDir = vdirs[0];
    }

    let mc = piece.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      dir: nDir,
      ang: PI_2,
    };
  };

  axis.scramble = function () {
    if (!axis.toMove) return;

    const MOVES = 40;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random(pieces) as Piece;
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = axis.toMove(p, s, vec) as ToMoveResult;
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  axis.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  axis.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(axis, axis.faceColors);

  return axis;
}
