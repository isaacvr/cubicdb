import { Vector3D, UP, DOWN, FRONT, CENTER } from "../vector3d";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import type { PuzzleInterface } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";

export function MEIER_HALPERN_PYRAMIND(): PuzzleInterface {
  let mhp: PuzzleInterface = {
    center: new Vector3D(0, 0, 0),
    palette: STANDARD_PALETTE,
    pieces: [],
    rotation: {},
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["g", "b", "y", "r"],
    move: () => true,
    dims: [],
    roundParams: [],
  };

  mhp.getAllStickers = getAllStickers.bind(mhp);

  const PI = Math.PI;
  const ANG = (2 * PI) / 3;
  const L = 2.6;
  const V = L / Math.sqrt(3);
  const H = Math.sqrt(L ** 2 - V ** 2);
  const R = (Math.sqrt(6) * L) / 12;
  let PU = UP.mul(H - R);
  let PR = DOWN.mul(R)
    .add(FRONT.mul(V))
    .rotate(CENTER, UP, ANG / 2);
  let PB = PR.rotate(CENTER, UP, ANG);
  let PL = PB.rotate(CENTER, UP, ANG);

  let pieces: Piece[] = (mhp.pieces = []);
  let fv: Vector3D[] = (mhp.faceVectors = []);
  let cross = Vector3D.cross;

  const FACTOR = 1 / 4;
  const ANCHORS = [PU, PR, PB, PL];

  let getDir = (i: number, j: number) => ANCHORS[j].sub(ANCHORS[i]).mul(FACTOR);
  let DUL = getDir(0, 3);
  let DUR = getDir(0, 1);
  let DLR = getDir(3, 1);

  let cornerSticker = new Sticker([PU, PU.add(DUL), PU.add(DUL).add(DUR), PU.add(DUR)], "", [
    cross(PU, PL, PR),
    cross(PU, PR, PB),
    cross(PU, PB, PL),
  ]);

  let cornerPiece = new Piece([0, 1, 2].map(n => cornerSticker.rotate(CENTER, UP, ANG * n)));

  fv.push(DOWN, ...cornerPiece.stickers.map(s => s.getOrientation()));

  pieces.push(...[0, 1, 2].map(n => cornerPiece.rotate(CENTER, fv[1], ANG * n)));
  pieces.push(cornerPiece.rotate(CENTER, fv[1], ANG).rotate(CENTER, DOWN, ANG));

  let edgeST = new Sticker(
    [PU.add(DUL), PL.sub(DUL), PL.sub(DUL).add(DLR), PU.add(DUL).add(DUR)],
    "",
    [cross(PU, PB, PL)]
  );

  let edgePiece = new Piece([edgeST, edgeST.reflect(CENTER, PU, PL, true)]);

  pieces.push(...[0, 1, 2].map(n => edgePiece.rotate(CENTER, UP, ANG * n)));
  pieces.push(
    ...[0, 1, 2].map(n => edgePiece.reflect(CENTER, PL, PB, true).rotate(CENTER, UP, ANG * n))
  );

  let centerST = new Piece([
    new Sticker(
      [0, 1, 2].map(n =>
        PU.add(DUL)
          .add(DUR)
          .rotate(CENTER, fv[1], ANG * n)
      )
    ),
  ]);

  pieces.push(...[0, 1, 2].map(n => centerST.rotate(CENTER, UP, ANG * n)));
  pieces.push(centerST.reflect(CENTER, PL, PR, true));

  mhp.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  mhp.scramble = function () {
    if (!mhp.toMove) return;

    const MOVES = 100;
    const _pieces = pieces.slice(0, pieces.length - 4);

    for (let i = 0; i < MOVES; i += 1) {
      let p = random(_pieces) as Piece;
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > EPS));
      let pcs = mhp.toMove(p, s, vec);
      let cant = 1 + random(4);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  assignColors(mhp, mhp.faceColors);

  // Initial rotation
  mhp.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  return mhp;
}
