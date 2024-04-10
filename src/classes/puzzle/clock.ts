// import { STANDARD_PALETTE } from '@constants';
import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from '@classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { Sticker } from './Sticker';
import { Piece } from './Piece';
import { FaceSticker } from './FaceSticker';

export function CLOCK(): PuzzleInterface {

  /// This is for compatibility only!!
  let clock: PuzzleInterface = {
    center: CENTER,
    faceColors: ['white', 'black'],
    faceVectors: [FRONT, BACK],
    getAllStickers: () => [],
    move: () => true,
    palette: {
      black: '#181818',
      white: '#aaa',
      gray: '#7f7f7f',
      darkGray: '#1e1e1e',
      red: '#ff0000',
    },
    pieces: [],
    rotation: { x: 0, y: 0, z: 0 },
    dims: [],
    roundParams: [],
    isRounded: true,
  };

  let pins: boolean[] = [false, false, false, false];
  let clocks = [
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  ];

  let add = function (i: number, j: number, k: number, val: number) {
    clocks[i][j][k] = ((clocks[i][j][k] + val) % 12 + 12) % 12;
  };

  let mat = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  let pieces = clock.pieces;

  const PINS1 = pins.map((_, p: number) => !pins[ ((p >> 1) << 1) + 1 - (p & 1) ]);
  const WIDTH = 0.2;

  function extrudeSticker(s: Sticker, u: Vector3D, close = false): FaceSticker {
    let s1 = s.add(u);
    let faces: number[][] = [];

    for (let i = 0, maxi = s.points.length; i < maxi; i += 1) {
      let ni = (i + 1) % maxi;
      faces.push([ i, maxi + i, maxi + ni ]);
      faces.push([ i, maxi + ni, ni ]);
    }

    if ( close ) {
      for (let i = 1, maxi = s.points.length - 1; i < maxi; i += 1) {
        faces.push([ 0, i + 1, i ]);
      }
    }

    return new FaceSticker( [ ...s.points, ...s1.points ], faces, s.color);
  }

  function drawSingleClock(MAT: any, PINS: any, BLACK: string, WHITE: string, GRAY: string, extrude: boolean, f: (p: Piece) => Piece) {
    const RAD = 1;
    const W = RAD * 0.582491582491582;
    const RAD_CLOCK = RAD * 0.20202020202020;
    const BORDER = RAD * 0.0909090909090909;
    const BORDER1 = RAD * 0.02;

    const PI = Math.PI;
    const TAU = PI * 2;

    const X = 0;
    const Y = 0;

    const LAYER_V = FRONT.mul(0.002);
    const CROSS_LAYER = (-2 + 0 * LAYER_V.abs()) * WIDTH / LAYER_V.abs();

    let levelSticker = (s: Sticker, layer: number, self = false) => {
      return s.add(LAYER_V.mul(layer), self);
    }

    function circle(x: number, y: number, rad: number, col: string, layer: number) {
      let ct = new Vector3D(x, y);
      let points: Vector3D[] = [];

      for (let i = 0, maxi = 100; i < maxi; i += 1) {
        points.push(RIGHT.mul(rad).rotate(CENTER, FRONT, TAU * i / maxi).add(ct));
      }

      return new Piece([levelSticker(new Sticker(points, col, [], false, 'circle'), layer, true)]);
    }

    function pushExtrudedCircle(x: number, y: number, rad: number, col: string, col1: string, layer: number, layer1: number) {
      let c = circle(x, y, rad, col, layer);
      let c1 = new Piece([ extrudeSticker(c.stickers[0], LAYER_V.mul(layer1 - layer)) ]);

      c1.stickers[0].color = col1;

      c.stickers.forEach(s => s.nonInteractive = true);
      c1.stickers.forEach(s => s.nonInteractive = true);

      pieces.push( f( c ), f( c1 ) );
    }

    const arrow = new Sticker([
      new Vector3D(0.0000, 1.0000),
      new Vector3D(0.1491, 0.4056),
      new Vector3D(0.0599, 0.2551),
      new Vector3D(0.0000, 0.0000),
      new Vector3D(-0.0599, 0.2551),
      new Vector3D(-0.1491, 0.4056),
    ], BLACK).mul(RAD_CLOCK, true);

    const circles = new Sticker([
      new Vector3D(0.1672),
      new Vector3D(0.1254),
    ]).mul(RAD_CLOCK, true);

    const R_PIN = circles.points[0].x * 2.3;

    if ( extrude ) {
      pushExtrudedCircle(X, Y, RAD, WHITE, 'darkGray', 0, CROSS_LAYER);
    } else {
      pieces.push( f( circle(X, Y, RAD, WHITE, 0) ) );
    }

    for (let i = -1; i < 2; i += 2) {
      for (let j = -1; j < 2; j += 2) {
        if ( extrude ) {
          pushExtrudedCircle(X + W * i, Y + W * j, RAD_CLOCK + BORDER + BORDER1, WHITE, 'darkGray', 0, CROSS_LAYER);
        } else {
          pieces.push( f( circle(X + W * i, Y + W * j, RAD_CLOCK + BORDER + BORDER1, WHITE, 0)) );
        }
        pieces.push( f( circle(X + W * i, Y + W * j, RAD_CLOCK + BORDER, BLACK, 1)) );
      }
    }

    pieces.push( f( circle(X, Y, RAD - BORDER1, BLACK, 1) ) );

    for (let i = -1; i < 2; i += 1) {
      for (let j = -1; j < 2; j += 1) {
        pushExtrudedCircle(X + W * i, Y + W * j, RAD_CLOCK, WHITE, GRAY, 6, 2);

        const ANCHOR = new Vector3D(X + W * i, Y + W * j);
        let angId = MAT[j + 1][i + 1];
        let ang = angId * TAU / 12;

        let arrowPiece = new Piece([levelSticker(arrow.rotate(CENTER, FRONT, ang).add(ANCHOR), 10, true)]);
        let eArrowPiece = new Piece([ extrudeSticker(arrowPiece.stickers[0], LAYER_V.mul(6 - 10)) ]);

        eArrowPiece.stickers[0].color = GRAY;

        pieces.push( f( arrowPiece ) );
        pieces.push( f( eArrowPiece ) );

        pushExtrudedCircle(ANCHOR.x, ANCHOR.y, circles.points[0].x, BLACK, GRAY, 10, 6);
        pieces.push( f( circle(ANCHOR.x, ANCHOR.y, circles.points[1].x, WHITE, 11) ) );

        for (let a = 0; a < 12; a += 1) {
          let pt = ANCHOR.add(UP.mul(RAD_CLOCK + BORDER / 2).rotate(CENTER, FRONT, a * TAU / 12));
          let r = circles.points[0].x / 4 * (a ? 1 : 1.6);
          let c = a ? WHITE : 'red';
          
          pushExtrudedCircle(pt.x, pt.y, r, c, c === 'red' ? c : GRAY, 10, 6);
        }

        if (i <= 0 && j <= 0) {
          let val = PINS[(j + 1) * 2 + i + 1];
          pieces.push( f( circle(ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN, (val) ? WHITE : GRAY, 3) ) );
          pieces.push( f( circle(ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN * 0.8, (val) ? BLACK : GRAY, 4) ) );
        }
      }
    }
  }

  drawSingleClock(clocks[0], PINS1, 'black', 'white', 'gray', true, (e: Piece) => e.add( FRONT.mul(WIDTH), true ));
  drawSingleClock(clocks[1], pins, 'white', 'black', 'gray', false,
    (e: Piece) => e.add( FRONT.mul(WIDTH), true ).rotate(CENTER, UP, Math.PI, true));

  clock.move = function (moves: any[]) {
    let first = true;
    let upFace = 0;
    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let mv = moves[i];
      let pinCode = mv[0];
      let up = mv[1];
      let down = mv[2];

      if (mv[0] === -1) {
        upFace ^= 1;
        continue;
      }

      mat.forEach(m => m.fill(0));

      for (let j = 0, mask = 8; j < 4; j += 1, mask >>= 1) {
        if (isNaN(up) || isNaN(down)) {
          if (first) {
            pins.length = 0;
            pins.push(false, false, false, false);
            first = false;
          }
          pins[j] = (pinCode & mask) ? true : pins[j];
        } else {
          pins[j] = !!(pinCode & mask);
        }
        if (pins[j]) {
          let x = j >> 1;
          let y = j & 1;
          mat[x][y] = mat[x + 1][y] = mat[x][y + 1] = mat[x + 1][y + 1] = 1;
        }
      }

      if (!isNaN(up) && !isNaN(down)) {
        for (let x = 0; x < 3; x += 1) {
          for (let y = 0; y < 3; y += 1) {
            if (mat[x][y]) {
              add(upFace, x, y, up);

              // Handle back corners
              if ((x & 1) == 0 && (y & 1) == 0) {
                add(1 - upFace, x, 2 - y, -up);
              }
            }
          }
        }
      }

    }
  };

  clock.raw = [
    pins, clocks
  ];

  return clock;
}