import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "./../vector3d";
import { Vector3D } from "../../classes/vector3d";
import type { PuzzleInterface, ToMoveResult, VectorLike3D } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, random } from "./puzzleUtils";
import { generateGearScramble } from "@cstimer/scramble/gearcube";

function stickerFromPath(
  px: number[],
  py: number[],
  a1: Vector3D,
  a2: Vector3D,
  a3: Vector3D
): Sticker {
  const cx = [...px];
  const cy = [...py];
  for (let i = cx.length - 2; i >= 1; i -= 1) {
    let v = new Vector3D(cx[i], cy[i], 0);
    v = v.reflect(a1, a2, a3);
    cx.push(v.x);
    cy.push(v.y);
  }

  return new Sticker(
    cx.map((e, p) => {
      return new Vector3D(e, 1, -cy[p]);
    })
  );
}

function getType(p: Piece): number {
  return p.stickers.filter(s => s.color != "d").length;
}

function edgeCallback(
  p: Piece,
  center: VectorLike3D,
  dir: VectorLike3D,
  ang: number,
  three?: boolean,
  vc?: any,
  ignoreUserData?: boolean
) {
  const c = new Vector3D(center.x, center.y, center.z);
  const dir1 = new Vector3D(dir.x, dir.y, dir.z).toNormal();

  if (three) {
    const p1 = <any>p;
    const a = (<Piece>(ignoreUserData ? p1.userData : p1.userData.data)).anchor.rotate(
      c,
      dir1,
      ang
    );
    const u1 = new vc(a.x, a.y, a.z);
    const u1n = u1.clone().normalize();
    p1.rotateOnWorldAxis(dir, ang);
    p1.rotateOnWorldAxis(u1n, (-ang * 4) / 3);
  } else {
    p.rotate(c, p.anchor, (-ang * 4) / 3, true).rotate(c, dir1.toNormal(), ang, true);
  }
}

export function GEAR(): PuzzleInterface {
  const gear: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    faceColors: ["y", "o", "g", "w", "r", "b"],
    move: () => true,
    roundParams: { rd: 0.2, scale: 0.9, fn: (s: Sticker) => s.color != "x" },
  };

  // rd
  // scale
  // ppc
  // fn
  // justScale

  gear.getAllStickers = getAllStickers.bind(gear);

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI23 = (PI * 2) / 3;

  const LUF = LEFT.add(UP).add(FRONT);

  const pieces = gear.pieces;
  const cx = [-1, -0.35, -0.35, -0.527, -0.486, -0.333, -0.313, -0.484];
  const cy = [-1, -1, -0.9175, -0.792, -0.623, -0.62, -0.521, -0.484];

  const cornerSticker = stickerFromPath(cx, cy, CENTER, FRONT, LEFT.add(DOWN));
  const c1 = LUF.add(RIGHT.add(BACK).add(DOWN).mul(0.65));

  cornerSticker.vecs = [LEFT, UP, FRONT];

  const cornerStickers = [cornerSticker];

  for (let i = 0, maxi = cornerSticker.points.length; i < maxi; i += 1) {
    cornerStickers.push(
      new Sticker([c1, cornerSticker.points[(i + 1) % maxi], cornerSticker.points[i]])
    );
  }

  for (let i = 0, maxi = cornerStickers.length; i < maxi; i += 1) {
    cornerStickers.push(cornerStickers[i].rotate(LUF, LUF, PI23));
    cornerStickers.push(cornerStickers[i].rotate(LUF, LUF, -PI23));
  }

  const cornerPiece = new Piece(cornerStickers);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(cornerPiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(cornerPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  const ex = [-1, -1, -0.895, -0.8, -0.673, -0.769, -0.685, -0.532, -0.532];
  const ey = [0, 0.32, 0.321, 0.457, 0.37, 0.233, 0.091, 0.088, 0];

  const edgeSticker = stickerFromPath(ex, ey, CENTER, FRONT, LEFT).reverse();
  const LU = UP.add(LEFT);
  edgeSticker.vecs = [UP, LEFT];

  for (let i = 0; i < 2; i += 1) {
    edgeSticker.vecs.push(edgeSticker.vecs[i].rotate(CENTER, LU, PI23));
    edgeSticker.vecs.push(edgeSticker.vecs[i].rotate(CENTER, LU, -PI23));
  }

  const c2 = LEFT.add(UP).sub(LEFT.add(UP).mul(0.65));
  const edgeStickers = [edgeSticker];

  for (let i = 0, maxi = edgeSticker.points.length; i < maxi; i += 1) {
    edgeStickers.push(new Sticker([c2, edgeSticker.points[(i + 1) % maxi], edgeSticker.points[i]]));
  }

  for (let i = 0, maxi = edgeStickers.length; i < maxi; i += 1) {
    edgeStickers.push(edgeStickers[i].rotate(LEFT.add(UP), LEFT.add(UP), PI));
  }

  const edgePiece = new Piece(edgeStickers);
  edgePiece.anchor = LEFT.add(UP);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(edgePiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  const wx = [0.49, 0.49, 0.295, 0.287, 0.373, 0.373];
  const wy = [0, 0.22, 0.22, 0.149, 0.15, 0];

  const wingSticker = stickerFromPath(wx, wy, CENTER, FRONT, LEFT);
  wingSticker.vecs = [RIGHT];

  const wingPiece = new Piece([wingSticker]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(wingPiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(wingPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(wingPiece.rotate(CENTER, BACK, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(wingPiece.rotate(CENTER, RIGHT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(wingPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(wingPiece.rotate(CENTER, RIGHT, PI).rotate(CENTER, UP, PI_2 * i));
  }

  const centerStickers = [
    new Sticker([
      UP.add(LEFT.add(BACK).mul(0.23)),
      UP.add(LEFT.add(FRONT).mul(0.23)),
      UP.add(RIGHT.add(FRONT).mul(0.23)),
      UP.add(RIGHT.add(BACK).mul(0.23)),
    ]),
  ];

  const centerBase = centerStickers[0].add(DOWN).mul(2.2).add(UP.mul(0.5));

  for (let i = 0; i < 4; i += 1) {
    centerStickers.push(
      new Sticker([
        centerStickers[0].points[i],
        centerBase.points[i],
        centerBase.points[(i + 1) % 4],
        centerStickers[0].points[(i + 1) % 4],
      ])
    );
  }

  const centerPiece = new Piece(centerStickers);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(centerPiece.rotate(CENTER, FRONT, PI_2 * i));
  }

  pieces.push(centerPiece.rotate(CENTER, RIGHT, PI_2));
  pieces.push(centerPiece.rotate(CENTER, LEFT, PI_2));

  gear.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    if (![RIGHT, UP, FRONT].reduce((ac, v) => ac || v.cross(dir).abs() < EPS, false)) {
      return [];
    }

    const toMovePieces = pieces.filter(p => {
      const goodStickers = p.stickers.filter(s => s.color != "d");
      return goodStickers.reduce((ac, s) => ac || s.direction1(CENTER, dir) >= 0, false);
    });

    const centralPieces: Piece[] = [];
    const borderPieces: Piece[] = [];

    toMovePieces.forEach(p => {
      const central = p.direction1(CENTER, dir, false, (s: Sticker) => s.color != "d") === 0;

      if (central) {
        const type = getType(p);

        if (type === 2) {
          p.hasCallback = true;
          p.callback = edgeCallback;
        }

        centralPieces.push(p);
      } else {
        p.hasCallback = false;
        borderPieces.push(p);
      }
    });

    return [
      {
        pieces: centralPieces,
        ang: PI_2,
        animationTime: 500,
      },
      {
        pieces: borderPieces,
        ang: PI,
        animationTime: 500,
      },
    ];
  };

  gear.move = function (scramble: string[]) {
    const scr = scramble[0].trim().split(/\s+/g);
    const moves = [UP, RIGHT, FRONT];
    const _pieces = pieces.slice(0, 8);

    for (let i = 0, maxi = scr.length; i < maxi; i += 1) {
      const m = scr[i];
      const pos = "URF".indexOf(m[0]);
      const dir = m.endsWith("'") ? -1 : 1;
      const cant = isNaN(parseInt(m.slice(1))) ? 1 : parseInt(m.slice(1));
      const fp = _pieces.filter(p => p.direction1(moves[pos].mul(0.8), moves[pos]) === 0);

      const p = random(fp) as Piece;
      const st = random(p.stickers.filter(s => s.color != "d")) as Sticker;
      const v = moves[pos];
      const pcs = gear.toMove!(p, st, v) as ToMoveResult[];

      pcs.forEach((pc: any) => {
        pc.pieces.forEach((p: Piece) => {
          if (p.hasCallback) {
            p.callback(p, CENTER, v, pc.ang * dir * cant);
          } else {
            p.rotate(CENTER, v, pc.ang * dir * cant, true);
          }
        });
      });
    }
  };

  gear.scramble = function () {
    gear.move([generateGearScramble("gearo")]);
  };

  gear.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  gear.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(gear, gear.faceColors);

  pieces.forEach(p =>
    p.stickers.forEach(s => {
      if (s.color == "x") {
        s.color = "d";
        s.oColor = "d";
      }
    })
  );

  return gear;
}
