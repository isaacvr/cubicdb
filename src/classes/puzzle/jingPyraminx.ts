import { Vector3D, UP, DOWN, FRONT, CENTER } from "../vector3d";
import type { Sticker } from "./Sticker";
import type { Piece } from "./Piece";
import { assignColors, getAllStickers } from "./puzzleUtils";
import type { PuzzleInterface } from "@interfaces";
import { STANDARD_PALETTE } from "@constants";

export function JING_PYRAMINX(): PuzzleInterface {
  let jpm: PuzzleInterface = {
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

  jpm.getAllStickers = getAllStickers.bind(jpm);

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

  let pieces = (jpm.pieces = []);
  let fv = (jpm.faceVectors = []);
  let cross = Vector3D.cross;

  const FACTOR = 1 / 4;
  const ANCHORS = [PU, PR, PB, PL];

  let getDir = (i: number, j: number) => ANCHORS[j].sub(ANCHORS[i]).mul(FACTOR);
  let DUL = getDir(0, 3);
  let DUR = getDir(0, 1);
  let DLR = getDir(3, 1);

  jpm.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter((p: Piece) => p.direction1(mc, dir) >= 0);
    return {
      pieces: toMovePieces,
      ang: ANG,
    };
  };

  assignColors(jpm, jpm.faceColors);

  // Initial rotation
  jpm.rotation = {
    x: Math.PI / 6,
    y: -Math.PI / 4,
    z: 0,
  };

  return jpm;
}
