import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from "@classes/vector3d";
import { Vector3D } from "@classes/vector3d";
import type { PuzzleInterface } from "@interfaces";
import { EPS, STANDARD_PALETTE } from "@constants";
import { Piece } from "./Piece";
import { Sticker } from "./Sticker";
import { assignColors, getAllStickers, scaleSticker } from "./puzzleUtils";
import { getRandomScramble } from "@cstimer/scramble/scramble_333";
import { ScrambleParser } from "@classes/scramble-parser";
import { A, G, N } from "./ganLogo";
import { FaceSticker } from "./FaceSticker";

export function GAN333(): PuzzleInterface {
  const n = 3;
  const len = 2 / 3;

  const edgePoint = (p: Vector3D) =>
    [p.x, p.y, p.z].reduce(
      (acc, n) => ([-1, 0, 1].some(d => Math.abs(d - n) < EPS) ? acc + 1 : acc),
      0
    );

  const gan: PuzzleInterface = {
    pieces: [],
    palette: Object.assign({}, STANDARD_PALETTE, {
      cornerMagnetBase: "rgb(130, 130, 130)",
      cornerMagnet: "rgb(255, 255, 255)",
      edgeMagnetBase: "rgb(126, 126, 73)",
      edgeMagnet: "rgb(255, 255, 0)",
      x: "#bbb",
      ganBlue: "#00589C",
    }),
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [3, 3, 3],
    faceColors: ["w", "r", "g", "y", "o", "b"],
    move: () => false,
    roundParams: {
      rd: (s: Sticker, i: number) => {
        const acc = s.points.reduce((acc, v) => acc + (edgePoint(v) >= 2 ? 1 : 0), 0);
        const smallRound = 0.05;

        if (acc === 3) {
          return [smallRound];
        } else if (acc === 2) {
          if (i === 1 || i === 2) {
            return i === 1 ? [0.3, 0.47] : [0.47, 0.3];
          }
          return [smallRound];
        } else if (acc === 1) {
          return i === 0 ? [smallRound] : 0.3;
        }

        return 0.4;
      },
    },
  };

  // rd
  // scale
  // ppc
  // fn
  // justScale

  gan.getAllStickers = getAllStickers.bind(gan);

  const ref = LEFT.add(BACK).add(UP);
  const cornerCenter = ref.add(
    RIGHT.add(FRONT)
      .add(DOWN)
      .mul(len / 2)
  );
  const MF = len * 0.2;
  const magnetRef = ref.add(FRONT.add(RIGHT).setLength(MF));

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [RIGHT, FRONT, UP];

  const pieces = gan.pieces;

  const sticker = new Sticker(
    [ref, ref.add(FRONT.mul(len)), ref.add(FRONT.add(RIGHT).mul(len)), ref.add(RIGHT.mul(len))],
    undefined,
    vdir
  );

  const stickerMB = new Sticker(
    [
      magnetRef,
      magnetRef.add(FRONT.mul(MF)),
      magnetRef.add(FRONT.add(RIGHT).mul(MF)),
      magnetRef.add(RIGHT.mul(MF)),
    ],
    "cornerMagnetBase",
    [],
    true
  ).add(UP.mul(0.005), true);

  const stickerM = scaleSticker(stickerMB, 0.6);
  stickerM.color = stickerM.oColor = "cornerMagnet";

  const cornerPiece = new Piece([
    sticker,
    sticker.rotate(CENTER, ref, (2 * PI) / 3),
    sticker.rotate(CENTER, ref, (-2 * PI) / 3),
    ...[sticker, stickerMB, stickerM].map(s => s.reflect1(cornerCenter, UP, true)),
    ...[sticker, stickerMB, stickerM].map(s =>
      s.rotate(CENTER, ref, (2 * PI) / 3).reflect1(cornerCenter, FRONT, true)
    ),
    ...[sticker, stickerMB, stickerM].map(s =>
      s.rotate(CENTER, ref, (-2 * PI) / 3).reflect1(cornerCenter, RIGHT, true)
    ),
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(cornerPiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(cornerPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  stickerMB.color = stickerMB.oColor = "edgeMagnetBase";
  stickerM.color = stickerM.oColor = "edgeMagnet";
  stickerMB.nonInteractive = stickerM.nonInteractive = true;

  const edgePiece = new Piece([
    sticker.add(RIGHT.mul(len)),
    sticker.add(RIGHT.mul(len)).rotate(CENTER, BACK.add(UP), PI),
    ...[sticker, stickerMB, stickerM].map(s =>
      s
        .rotate(CENTER, ref, (-2 * PI) / 3)
        .reflect1(cornerCenter, RIGHT, true)
        .add(RIGHT.mul(len))
    ),
    ...[sticker, stickerMB, stickerM].map((s, p) => {
      const st = s.rotate(CENTER, ref, (-2 * PI) / 3);
      return p ? st.add(RIGHT.mul(len)) : st.reflect1(cornerCenter, RIGHT);
    }),
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push(edgePiece.rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
    pieces.push(edgePiece.rotate(CENTER, FRONT, PI).rotate(CENTER, UP, PI_2 * i));
  }

  const centerPiece = new Piece([
    sticker.add(FRONT.add(RIGHT).mul(len)),
    sticker.add(FRONT.add(RIGHT).add(DOWN).mul(len)),
  ]);

  for (let i = 0; i < 4; i += 1) {
    i === 1 && pieces.push(centerPiece.rotate(CENTER, FRONT, PI * i));
    pieces.push(centerPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i));
  }

  centerPiece.stickers.push(...G.map(st => st.clone()));
  centerPiece.stickers.push(...A.map(st => st.clone()));
  centerPiece.stickers.push(...N.map(st => st.clone()));

  pieces.push(centerPiece);

  const MOVE_MAP = "URFDLB";

  const ref1 = ref
    .add(RIGHT.mul(n * len))
    .add(FRONT.mul(n * len))
    .add(DOWN.mul(n * len));

  const planes = [
    [ref, ref.add(FRONT), ref.add(RIGHT)],
    [ref1, ref1.add(BACK), ref1.add(UP)],
    [ref1, ref1.add(UP), ref1.add(LEFT)],
    [ref1, ref1.add(LEFT), ref1.add(BACK)],
    [ref, ref.add(DOWN), ref.add(FRONT)],
    [ref, ref.add(RIGHT), ref.add(DOWN)],
  ];

  gan.move = function (moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      const mv = moves[m];
      const moveId = MOVE_MAP.indexOf(mv[1]);
      const layers = mv[0] === n ? mv[0] + 1 : mv[0];
      const turns = mv[2];
      const pts1 = planes[moveId];
      const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
      const mu = u.mul(-1);
      const pts2 = pts1.map(p => p.add(mu.mul(len * layers)));
      const ang = (Math.PI / 2) * turns;

      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        const d = pieces[i].direction(pts2[0], pts2[1], pts2[2], true);

        if (d === 0) {
          console.log("Invalid move. Piece intersection detected.", "URFDLB"[moveId], turns, mv);
          console.log("Piece: ", i, pieces[i], pts2);
          return false;
        }

        if (d > 0) {
          pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang, true));
        }
      }
    }
    return true;
  };

  gan.toMove = function (piece: Piece, sticker: Sticker, dir: Vector3D) {
    const mc = sticker.updateMassCenter();
    const toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: PI_2,
    };
  };

  gan.toMoveSeq = function (m: string) {
    const mv = ["R", "L", "U", "D", "F", "B"];
    const mc = [
      new Vector3D(0.9, 0, 0),
      new Vector3D(-0.9, 0, 0),
      new Vector3D(0, 0.9, 0),
      new Vector3D(0, -0.9, 0),
      new Vector3D(0, 0, 0.9),
      new Vector3D(0, 0, -0.9),
    ];

    const pos = mv.indexOf(m[0]);

    if (pos < 0) {
      return {
        ang: 0,
        animationTime: 100,
        center: gan.center,
        pieces: [],
        dir: new Vector3D(),
      };
    }

    const dir = m[1] === "'" ? 1 : -1;
    const u: any = mc[pos];
    const toMovePieces = pieces.filter(p => p.direction1(u, u) === 0);

    return {
      ang: PI_2 * dir,
      animationTime: 100,
      center: gan.center,
      pieces: toMovePieces,
      dir: u,
    };
  };

  gan.scramble = function () {
    gan.move(ScrambleParser.parseNNN(getRandomScramble(), { a: n, b: n, c: n }));
  };

  gan.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  gan.faceVectors = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];

  assignColors(gan, gan.faceColors);

  centerPiece.stickers.forEach(st => {
    if (st instanceof FaceSticker) {
      st.color = "ganBlue";
    }
  });

  return gan;
}
