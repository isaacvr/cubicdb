import { UP, BACK, CENTER, RIGHT } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
// import { planeLineIntersection } from '@helpers/math';

export function PYRAMINX_CRYSTAL(): PuzzleInterface {
  const pCrystal: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: CENTER,
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: [
      "white",
      "yellow",
      "violet",
      "green",
      "red",
      "blue",
      "orange",
      "lblue",
      "lyellow",
      "pink",
      "lgreen",
      "gray",
    ],
    move: () => true,
    roundParams: {},
  };

  const PI = Math.PI;
  const sq = Math.sqrt;
  const F_INT = sq((50 + 22 * sq(5)) / 5) / 4;
  const F_EXT = (sq(6) / 4) * sq(3 + sq(5));
  const R_INT = 1;
  const SIDE = R_INT / F_INT;
  const R_EXT = SIDE * F_EXT;
  const RAD = sq(R_EXT ** 2 - R_INT ** 2);
  const INNER_ANG = (2 * PI) / 5;
  const ANG = (2 * PI) / 3;
  const RATIO = 0.276393202250021;
  const PLANE_NORM = 0.4472135954999585;
  const FACE_ANG = PI - Math.acos(Math.tan((18 * PI) / 180) * Math.tan((54 * PI) / 180));

  const anchors: Vector3D[] = [];
  const getRatio = (from: Vector3D, to: Vector3D) => from.add(to.sub(from).mul(RATIO));

  for (let i = 0; i < 5; i += 1) {
    anchors.push(UP.mul(R_INT).add(BACK.mul(RAD).rotate(CENTER, UP, i * INNER_ANG)));
  }

  // Helper to find the RATIO and PLANE_NORM
  const topFace = new Sticker(anchors);
  const topCenter = topFace.getMassCenter();

  pCrystal.getAllStickers = getAllStickers.bind(pCrystal);

  const pieces = pCrystal.pieces;
  const vdir = [UP, ...[0, 1, 2].map(n => topCenter.rotate(CENTER, anchors[n], ANG))];

  // Corners
  const cornerSticker = new Sticker(
    [getRatio(anchors[0], anchors[4]), anchors[0], getRatio(anchors[0], anchors[1]), topCenter],
    "",
    vdir.slice(0, 3)
  );

  const cornerPiece = new Piece(
    [0, 1, 2].map(n => cornerSticker.rotate(CENTER, anchors[0], ANG * n))
  );

  const topCorners = [0, 1, 2, 3, 4].map(n => cornerPiece.rotate(CENTER, UP, INNER_ANG * n));

  const fv = (pCrystal.faceVectors = [UP, ...topCorners.map(c => c.stickers[2].getOrientation())]);

  const fv1 = pCrystal.faceVectors.slice().map(v => v.rotate(CENTER, RIGHT, PI));

  for (let i = 1; i <= 3; i += 1) {
    fv1.splice(1, 0, fv1.pop()!);
  }

  fv.push(...fv1.reverse());

  pieces.push(...topCorners);
  pieces.push(...topCorners.map(c => c.rotate(CENTER, RIGHT, PI)));

  const midCorners = topCorners.reduce(
    (acc: Piece[], tc, v) => [
      ...acc,
      ...[1, 2].map(n => tc.rotate(CENTER, fv[v + 1], INNER_ANG * n)),
    ],
    []
  );

  pieces.push(...midCorners);

  // Edges
  const topSticker = new Sticker(
    [getRatio(anchors[0], anchors[1]), getRatio(anchors[1], anchors[0]), topCenter],
    "",
    vdir
  );

  const topEdge = new Piece([
    topSticker,
    topSticker.reflect1(CENTER, Vector3D.cross(CENTER, anchors[0], anchors[1]), true),
  ]);

  const topEdges = [0, 1, 2, 3, 4].map(n => topEdge.rotate(CENTER, UP, INNER_ANG * n));
  const bottomEdges = topEdges.map(e => e.rotate(CENTER, RIGHT, PI));

  pieces.push(...topEdges, ...bottomEdges);

  const midTopEdges = topEdges.reduce(
    (acc: Piece[], te, v) => [
      ...acc,
      ...[1, 2, 3].map(n => te.rotate(CENTER, fv[v + 1], INNER_ANG * n)),
    ],
    []
  );

  pieces.push(...midTopEdges);
  pieces.push(
    ...topEdges.map((e, v) =>
      e
        .rotate(CENTER, fv[v + 1], INNER_ANG)
        .reflect1(CENTER, UP, true)
        .rotate(CENTER, UP, INNER_ANG / 2)
    )
  );

  assignColors(pCrystal, pCrystal.faceColors);

  const getPointsFromSticker = (s: Sticker) => {
    const mc = s.getMassCenter();
    return s.points.map(p => p.add(mc.unit().mul(-0.5)));
  };

  const planes = [
    getPointsFromSticker(topEdge.stickers[0]), // U
    getPointsFromSticker(midTopEdges[6].stickers[0]), // L
    getPointsFromSticker(midTopEdges[9].stickers[0]), // F
    getPointsFromSticker(midTopEdges[12].stickers[0]), // R
    getPointsFromSticker(midTopEdges[1].stickers[0]), // B
    getPointsFromSticker(topEdge.rotate(CENTER, RIGHT, PI).stickers[0]), // D
    getPointsFromSticker(midTopEdges[5].stickers[0]), // dL
    getPointsFromSticker(midTopEdges[8].stickers[0]), // dR
    getPointsFromSticker(midTopEdges[3].stickers[0]), // bL
    getPointsFromSticker(midTopEdges[0].stickers[0]), // bR
    getPointsFromSticker(midTopEdges[2].stickers[0]), // DBL
    getPointsFromSticker(midTopEdges[11].stickers[0]), // DBR
    topEdge.stickers[0].points.map(p => p.clone()), // [u]
    midTopEdges[6].stickers[0].points.map(p => p.clone()), // [l]
    midTopEdges[9].stickers[0].points.map(p => p.clone()), // [f]
    midTopEdges[12].stickers[0].points.map(p => p.clone()), // [r]
  ];

  const trySingleMove = (mv: any): { pieces: Piece[]; u: Vector3D; ang: number } | null => {
    const moveId = mv[0];

    if (moveId >= planes.length) {
      return null;
    }

    const turns = mv[1];
    const pts1 = planes[moveId].map(e => e.clone());
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const ang = INNER_ANG * turns;

    const pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      const d = pieces[i].direction1(pts1[0], u, true);

      // if (d === 0) {
      //   console.log("Invalid move. Piece intersection detected.", "URFDLB"[moveId], turns, mv);
      //   console.log("Piece: ", i, pieces[i], pts1);
      //   return null;
      // }

      if (d * mv[2] >= 0) {
        pcs.push(pieces[i]);
      }
    }

    return {
      pieces: pcs,
      u,
      ang,
    };
  };

  pCrystal.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const pcs = trySingleMove(mv);

      if (!pcs) {
        return false;
      }

      const { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return true;
  };

  pCrystal.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    // let mc = sticker.updateMassCenter();
    const mc = dir.unit().mul(PLANE_NORM);
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir, true) >= 0);

    return {
      pieces: toMovePieces,
      ang: INNER_ANG,
    };
  };

  pCrystal.scramble = function () {
    if (!pCrystal.toMove) return;

    const MOVES = 100;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = pCrystal.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(4);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  pCrystal.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  pCrystal.raw = [
    anchors,
    FACE_ANG,
    2 / 5,
    RAD,
    SIDE,
    anchors.map(a => a.rotate(CENTER, RIGHT, PI)),
  ];

  return pCrystal;
}
