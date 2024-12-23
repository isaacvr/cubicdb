import { Vector3D, UP, DOWN, FRONT, CENTER } from "../vector3d";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import type { PuzzleInterface, ToMoveResult } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";

export function TETRAMINX(): PuzzleInterface {
  const tetra: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["g", "b", "y", "r", "g", "b", "y", "r"],
    move: () => true,
    dims: [],
    roundParams: {},
  };

  tetra.getAllStickers = getAllStickers.bind(tetra);

  const PI = Math.PI;
  const PI_3 = PI / 3;
  const L = 2.6;
  const V = L / Math.sqrt(3);
  const H = Math.sqrt(L ** 2 - V ** 2);
  const R = (Math.sqrt(6) * L) / 12;
  const PU = UP.mul(H - R);
  const PR = DOWN.mul(R).add(FRONT.mul(V)).rotate(CENTER, UP, PI_3);
  const PB = PR.rotate(CENTER, UP, 2 * PI_3);
  const PL = PB.rotate(CENTER, UP, 2 * PI_3);

  tetra.pieces = [];

  const ANCHORS = [PU, PR, PB, PL];

  /// front, right, down, left

  const n = 3;

  const UNITS = [
    [PL.sub(PU).div(3), PR.sub(PL).div(3)], // front
    [PB.sub(PR).div(3), PU.sub(PB).div(3)], // right (back)
    [PU.sub(PL).div(3), PB.sub(PU).div(3)], // left (back)
    [PR.sub(PB).div(3), PL.sub(PR).div(3)], // down
  ];

  tetra.faceVectors = [
    UNITS[0][0].cross(UNITS[0][1]).unit(), // front
    UNITS[1][0].cross(UNITS[1][1]).unit(), // right (back)
    UNITS[3][0].cross(UNITS[3][1]).unit(), // left (back)
    UNITS[2][0].cross(UNITS[2][1]).unit(), // down
  ];

  const fv = tetra.faceVectors;
  const pieces = tetra.pieces;

  const topSticker = new Sticker(
    [
      ANCHORS[0].add(UNITS[0][0]),
      ANCHORS[0].add(UNITS[0][0].add(UNITS[0][1])),
      ANCHORS[0].add(UNITS[2][1]),
    ],
    "",
    [UP, fv[0], fv[1], fv[3]]
  );

  const centerSticker = new Sticker(
    [
      PU.add(UNITS[0][0]),
      PU.add(UNITS[0][0].mul(2)).add(UNITS[0][1]),
      PU.add(UNITS[0][0]).add(UNITS[0][1]),
    ],
    "",
    [UP, fv[1], fv[2]]
  );

  const topPC = new Piece([
    topSticker,
    ...[0, 1, 2].map(n => centerSticker.rotate(CENTER, UP, 2 * PI_3 * n)),
  ]);

  pieces.push(
    topPC,
    topPC.reflect(CENTER, PR, PB, true),
    topPC.reflect(CENTER, PR, PL, true),
    topPC.reflect(CENTER, PB, PL, true)
  );

  const midSticker = new Sticker([
    PU.add(UNITS[0][0]),
    PU.add(UNITS[0][0].mul(2)),
    PU.add(UNITS[0][0].mul(2)).add(UNITS[0][1]),
  ]);

  const midPiece = new Piece([midSticker, midSticker.reflect(CENTER, PU, PL, true)]);

  midPiece.stickers.forEach(s => (s.vecs = [UP, fv[0], fv[1].mul(-1), fv[2]].map(v => v.clone())));

  pieces.push(...[0, 1, 2].map(n => midPiece.rotate(CENTER, UP, 2 * PI_3 * n)));
  pieces.push(
    ...[0, 1, 2].map(n => midPiece.rotate(CENTER, fv[0], 2 * PI_3).rotate(CENTER, UP, 2 * PI_3 * n))
  );

  tetra.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = piece.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: (2 * PI) / 3,
    };
  };

  tetra.scramble = function () {
    if (!tetra.toMove) return;

    const MOVES = 40;

    for (let i = 0; i < MOVES; i += 1) {
      const p = random(pieces) as Piece;
      const s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      const vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      const pcs = tetra.toMove(p, s, vec) as ToMoveResult;
      const cant = 1 + random(4);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  tetra.faceVectors.push(PU.unit(), PR.unit(), PL.unit(), PB.unit());

  assignColors(tetra, tetra.faceColors);

  tetra.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  return tetra;
}
