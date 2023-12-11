import { LEFT, UP, BACK, RIGHT, FRONT, DOWN, CENTER } from '@classes/vector3d';
import { Vector3D } from '@classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { STANDARD_PALETTE } from "@constants";
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers, random, scaleSticker } from './puzzleUtils';
import { getRandomScramble } from '@cstimer/scramble/scramble_333';
import { ScrambleParser } from '@classes/scramble-parser';
import { ImageSticker } from './ImageSticker';
import GAN_LOGO from '../../assets/gan_logo.svg';

export function GAN333(): PuzzleInterface {
  const n = 3;
  const len = 2 / 3;

  const edgePoint = (p: Vector3D) => [p.x, p.y, p.z].reduce((acc, n) =>
    [-1, 0, 1].some(d => Math.abs(d - n) < 1e-6) ? acc + 1 : acc, 0)

  const gan: PuzzleInterface = {
    pieces: [],
    palette: Object.assign({}, STANDARD_PALETTE, {
      cornerMagnetBase: "rgb(130, 130, 130)",
      cornerMagnet: "rgb(255, 255, 255)",
      edgeMagnetBase: "rgb(126, 126, 73)",
      edgeMagnet: "rgb(255, 255, 0)",
      x: '#bbb'
    }),
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [3, 3, 3],
    faceColors: [ 'w', 'r', 'g', 'y', 'o', 'b' ],
    move: () => false,
    roundParams: [ (s: Sticker, i: number) => {
      let acc = s.points.reduce((acc, v) => acc + (edgePoint(v) >= 2 ? 1 : 0), 0);
      const smallRound = 0.05;

      if ( acc === 3 ) {
        return [ smallRound ];
      } else if ( acc === 2 ) {
        if ( i === 1 || i === 2 ) {
          return i === 1 ? [0.3, 0.47] : [0.47, 0.3];
        }
        return [ smallRound ];
      } else if ( acc === 1 ) {
        return i === 0 ? [ smallRound ] : 0.3;
      }

      return 0.4;
    } ],
  };

  gan.getAllStickers = getAllStickers.bind(gan);

  const ref = LEFT.add( BACK ).add( UP );
  const cornerCenter = ref.add( RIGHT.add(FRONT).add(DOWN).mul(len / 2) );
  const MF = len * 0.2;
  const magnetRef = ref.add( FRONT.add(RIGHT).setLength(MF) );

  const PI = Math.PI;
  const PI_2 = PI / 2;
  const vdir = [ RIGHT, FRONT, UP ];

  let pieces = gan.pieces;

  let sticker = new Sticker([
    ref, ref.add( FRONT.mul(len) ), ref.add( FRONT.add(RIGHT).mul(len) ), ref.add( RIGHT.mul(len) )
  ], undefined, vdir);

  let stickerMB = new Sticker([
    magnetRef, magnetRef.add( FRONT.mul(MF) ), magnetRef.add( FRONT.add(RIGHT).mul(MF) ), magnetRef.add( RIGHT.mul(MF) )
  ], 'cornerMagnetBase', [], true).add( UP.mul(0.005), true);

  let stickerM = scaleSticker(stickerMB, 0.6);
  stickerM.color = stickerM.oColor = 'cornerMagnet';

  let cornerPiece = new Piece([
    sticker, sticker.rotate(CENTER, ref, 2 * PI / 3), sticker.rotate(CENTER, ref, -2 * PI / 3),
    ...[sticker, stickerMB, stickerM].map(s => s.reflect1(cornerCenter, UP, true)),
    ...[sticker, stickerMB, stickerM].map(s => s.rotate(CENTER, ref, 2 * PI / 3).reflect1(cornerCenter, FRONT, true)),
    ...[sticker, stickerMB, stickerM].map(s => s.rotate(CENTER, ref, -2 * PI / 3).reflect1(cornerCenter, RIGHT, true)),
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push( cornerPiece.rotate(CENTER, UP, PI_2 * i) );
    pieces.push( cornerPiece.rotate(CENTER, LEFT, PI_2).rotate(CENTER, UP, PI_2 * i) );
  }

  stickerMB.color = stickerMB.oColor = 'edgeMagnetBase';
  stickerM.color = stickerM.oColor = 'edgeMagnet';
  stickerMB.nonInteractive = stickerM.nonInteractive = true;

  let edgePiece = new Piece([
    sticker.add( RIGHT.mul(len) ), sticker.add( RIGHT.mul(len) ).rotate(CENTER, BACK.add(UP), PI),
    ...[ sticker, stickerMB, stickerM ].map(s => s.rotate(CENTER, ref, -2 * PI / 3).reflect1(cornerCenter, RIGHT, true).add( RIGHT.mul(len) )),
    ...[ sticker, stickerMB, stickerM ].map((s, p) => {
      let st = s.rotate(CENTER, ref, -2 * PI / 3);
      return p ? st.add( RIGHT.mul(len) ) : st.reflect1(cornerCenter, RIGHT)
    }),
  ]);

  for (let i = 0; i < 4; i += 1) {
    pieces.push( edgePiece.rotate(CENTER, UP, PI_2 * i) );
    pieces.push( edgePiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i) );
    pieces.push( edgePiece.rotate(CENTER, FRONT, PI).rotate(CENTER, UP, PI_2 * i) );
  }

  let centerPiece = new Piece([
    sticker.add( FRONT.add(RIGHT).mul(len) ),
    sticker.add( FRONT.add(RIGHT).add(DOWN).mul(len) )
  ]);

  for (let i = 0; i < 4; i += 1) {
    i === 1 && pieces.push(centerPiece.rotate(CENTER, FRONT, PI * i));
    pieces.push( centerPiece.rotate(CENTER, FRONT, PI_2).rotate(CENTER, UP, PI_2 * i) );
  }

  centerPiece.stickers.push(
    new ImageSticker(GAN_LOGO,
      sticker.add( FRONT.add(RIGHT).mul(len) ).points,
      undefined, [], true, 0.6
    ).add( UP.mul(0.01) )
  );

  pieces.push(centerPiece);

  const MOVE_MAP = "URFDLB";

  let ref1 = ref.add( RIGHT.mul(n * len) ).add( FRONT.mul(n * len) ).add( DOWN.mul(n * len) );

  let planes = [
    [ ref, ref.add(FRONT), ref.add(RIGHT) ],
    [ ref1, ref1.add(BACK), ref1.add(UP) ],
    [ ref1, ref1.add(UP), ref1.add(LEFT) ],
    [ ref1, ref1.add(LEFT), ref1.add(BACK) ],
    [ ref, ref.add(DOWN), ref.add(FRONT) ],
    [ ref, ref.add(RIGHT), ref.add(DOWN) ]
  ];

  gan.move = function(moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let moveId = MOVE_MAP.indexOf( mv[1] );
      let layers = mv[0] === n ? mv[0] + 1 : mv[0];
      let turns = mv[2];
      const pts1 = planes[moveId];
      const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
      const mu = u.mul(-1);
      const pts2 = pts1.map(p => p.add( mu.mul(len * layers) ));
      const ang = Math.PI / 2 * turns;

      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let d = pieces[i].direction(pts2[0], pts2[1], pts2[2], true);

        if ( d === 0 ) {
          console.log("Invalid move. Piece intersection detected.", "URFDLB"[moveId], turns, mv);
          console.log("Piece: ", i, pieces[i], pts2);
          return false;
        }

        if ( d > 0 ) {
          pieces[i].stickers.map(s => s.rotate(CENTER, mu, ang, true));
        }
      }
    }
    return true;
  };

  gan.toMove = function(piece: Piece, sticker: Sticker, dir: Vector3D) {
    let mc = sticker.updateMassCenter();
    let toMovePieces = pieces.filter(p => p.direction1(mc, dir) === 0);
    return {
      pieces: toMovePieces,
      ang: PI_2
    };
  };

  gan.scramble = function() {
    gan.move( ScrambleParser.parseNNN( getRandomScramble(), n ) );
  };

  gan.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };
  
  gan.faceVectors = [
    UP, RIGHT, FRONT, DOWN, LEFT, BACK
  ];

  assignColors(gan, gan.faceColors);
  
  return gan;

}