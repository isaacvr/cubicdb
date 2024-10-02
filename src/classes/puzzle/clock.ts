// import { STANDARD_PALETTE } from '@constants';
import { BACK, CENTER, DOWN, FRONT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import type { PuzzleInterface } from "@interfaces";
import { Sticker } from "./Sticker";
import { Piece } from "./Piece";
import { FaceSticker } from "./FaceSticker";
import { EPS } from "@constants";
import { getScramble } from "@cstimer/scramble/clock";
import { ScrambleParser } from "@classes/scramble-parser";

export function CLOCK(): PuzzleInterface {
  let clock: PuzzleInterface = {
    center: CENTER,
    faceColors: ["white", "black"],
    faceVectors: [FRONT, BACK],
    getAllStickers: () => [],
    move: () => true,
    palette: {
      black: "#181818",
      white: "#aaa",
      gray: "#7f7f7f",
      darkGray: "#1e1e1e",
      red: "#ff0000",
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
    clocks[i][j][k] = (((clocks[i][j][k] + val) % 12) + 12) % 12;
  };

  let mat = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  let pieces = clock.pieces;

  const WIDTH = 0.2;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const CLOCK_ANG = PI / 6;
  const TAU = PI * 2;
  const RAD = 1;
  const W = RAD * 0.582491582491582;
  const RAD_CLOCK = RAD * 0.2020202020202;
  const BORDER = RAD * 0.0909090909090909;
  const BORDER1 = RAD * 0.02;

  const X = 0;
  const Y = 0;

  function extrudeSticker(
    s: Sticker,
    u: Vector3D,
    closeIni = false,
    closeFin = false
  ): FaceSticker {
    let s1 = s.add(u);
    let faces: number[][] = [];

    for (let i = 0, maxi = s.points.length; i < maxi; i += 1) {
      let ni = (i + 1) % maxi;
      faces.push([i, maxi + i, maxi + ni]);
      faces.push([i, maxi + ni, ni]);
    }

    if (closeIni) {
      for (let i = 1, maxi = s.points.length - 1; i < maxi; i += 1) {
        faces.push([0, i, i + 1]);
      }
    }

    if (closeFin) {
      for (let i = 1, maxi = s.points.length - 1; i < maxi; i += 1) {
        faces.push([maxi + 1, maxi + i + 2, maxi + i + 1]);
      }
    }

    return new FaceSticker([...s.points, ...s1.points], faces, s.color);
  }

  function drawSingleClock(
    MAT: number[][],
    PINS: boolean[],
    BLACK: string,
    WHITE: string,
    GRAY: string,
    extrude: boolean,
    f: (p: Piece) => Piece
  ) {
    const LAYER_V = FRONT.mul(0.002);
    const CROSS_LAYER = (-2 * WIDTH) / LAYER_V.abs();

    let levelSticker = (s: Sticker, layer: number, self = false) => {
      return s.add(LAYER_V.mul(layer), self);
    };

    function circle(x: number, y: number, rad: number, col: string, layer: number) {
      let points: Vector3D[] = [];

      for (let i = 0, maxi = 100; i < maxi; i += 1) {
        points.push(
          new Vector3D(
            x + rad * Math.cos((TAU * i) / maxi),
            y + rad * Math.sin((TAU * i) / maxi),
            0
          )
        );
      }

      return new Piece([levelSticker(new Sticker(points, col, [], true, "circle"), layer, true)]);
    }

    function pushExtrudedCircle(
      x: number,
      y: number,
      rad: number,
      col: string,
      col1: string,
      layer: number,
      layer1: number,
      nonInteractive = true
    ) {
      let c = circle(x, y, rad, col, layer);
      let c1 = new Piece([extrudeSticker(c.stickers[0], LAYER_V.mul(layer1 - layer))]);

      c1.stickers[0].color = col1;

      c.stickers.forEach(s => (s.nonInteractive = nonInteractive));
      c1.stickers.forEach(s => (s.nonInteractive = nonInteractive));

      pieces.push(f(c), f(c1));
    }

    const arrow = new Sticker(
      [
        new Vector3D(0.0, 1.0),
        new Vector3D(0.1491, 0.4056),
        new Vector3D(0.0599, 0.2551),
        new Vector3D(0.0, 0.0),
        new Vector3D(-0.0599, 0.2551),
        new Vector3D(-0.1491, 0.4056),
      ],
      BLACK,
      [],
      true,
      "arrow"
    ).mul(RAD_CLOCK, true);

    const circles = new Sticker([new Vector3D(0.1672), new Vector3D(0.1254)]).mul(RAD_CLOCK, true);

    const R_PIN = circles.points[0].x * 2.3;

    if (extrude) {
      // Big background circle
      let st = new Sticker();
      let ang1 = -CLOCK_ANG * 0.96;
      let ang2 = CLOCK_ANG * 0.96;
      let a = UP.mul(RAD - BORDER1)
        .rotate(CENTER, FRONT, ang1, true)
        .add(LAYER_V.mul(1), true);

      for (let i = 0, maxi = 20; i <= maxi; i += 1) {
        let alpha = i / maxi;
        st.points.push(a.rotate(CENTER, FRONT, (ang2 - ang1) * alpha));
      }

      st.updateMassCenter();
      st.nonInteractive = true;

      let fst = extrudeSticker(st, LAYER_V.mul(CROSS_LAYER / 2), false, false);
      fst.color = WHITE;
      fst.nonInteractive = true;

      for (let i = 0; i < 4; i += 1) {
        pieces.push(new Piece([fst.rotate(CENTER, FRONT, PI_2 * i)]));
      }

      fst.color = BLACK;
      fst.add(LAYER_V.mul(-CROSS_LAYER / 2), true);

      for (let i = 0; i < 4; i += 1) {
        pieces.push(new Piece([fst.rotate(CENTER, FRONT, PI_2 * i)]));
      }
    } else {
      pieces.push(f(circle(X, Y, RAD, WHITE, 0)));
    }

    for (let i = -1; i < 2; i += 2) {
      for (let j = -1; j < 2; j += 2) {
        if (extrude) {
          // Wheel
          let wheelHandle = circle(0, 0, 0.1, BLACK, -CROSS_LAYER / 2);
          wheelHandle.stickers[0].points.forEach(p =>
            p.setCoords(X + W * i + p.x * 0.7, Y + W * j + p.y * 3, p.z)
          );
          wheelHandle.updateMassCenter();
          let wheel = extrudeSticker(wheelHandle.stickers[0], LAYER_V.mul(CROSS_LAYER), true, true);
          wheel.points.forEach(pt => pt.setCoords(pt.x, pt.y, pt.z * 0.98));
          wheel.updateMassCenter();
          wheel.color = WHITE;
          wheel.nonInteractive = true;

          for (let ang = 0; ang < 6; ang += 1) {
            let pcs = new Piece([
              wheel.rotate(new Vector3D(X + W * i, Y + W * j, 0), FRONT, ang * CLOCK_ANG),
            ]);

            pcs.stickers.forEach(st => (st.nonInteractive = true));
            pieces.push(pcs);
          }
        } else {
          pieces.push(f(circle(X + W * i, Y + W * j, RAD_CLOCK + BORDER + BORDER1, WHITE, 0)));
        }
        pieces.push(f(circle(X + W * i, Y + W * j, RAD_CLOCK + BORDER, BLACK, 1)));
      }
    }

    pieces.push(f(circle(X, Y, RAD - BORDER1, BLACK, 1)));

    for (let i = -1; i < 2; i += 1) {
      for (let j = -1; j < 2; j += 1) {
        // Dial background - interactive
        pushExtrudedCircle(X + W * i, Y + W * j, RAD_CLOCK, WHITE, GRAY, 6, 2, false);

        const ANCHOR = new Vector3D(X + W * i, Y + W * j);
        let angId = MAT[j + 1][i + 1];
        let ang = angId * CLOCK_ANG;

        let arrowPiece = new Piece([
          levelSticker(arrow.rotate(CENTER, FRONT, ang).add(ANCHOR), 10, true),
        ]);

        let eArrowPiece = new Piece([extrudeSticker(arrowPiece.stickers[0], LAYER_V.mul(6 - 10))]);

        eArrowPiece.stickers[0].color = GRAY;

        let combinedArrow = new Piece([...arrowPiece.stickers, ...eArrowPiece.stickers]);
        combinedArrow.stickers.forEach(st => (st.userData = [i, j]));

        pieces.push(f(combinedArrow));

        // Dial center
        pushExtrudedCircle(ANCHOR.x, ANCHOR.y, circles.points[0].x, BLACK, GRAY, 10, 6);
        pieces.push(f(circle(ANCHOR.x, ANCHOR.y, circles.points[1].x, WHITE, 11)));

        for (let a = 0; a < 12; a += 1) {
          let pt = ANCHOR.add(UP.mul(RAD_CLOCK + BORDER / 2).rotate(CENTER, FRONT, (a * TAU) / 12));
          let r = (circles.points[0].x / 4) * (a ? 1 : 1.6);
          let c = a ? WHITE : "red";

          // Hours
          pushExtrudedCircle(pt.x, pt.y, r, c, c === "red" ? c : GRAY, 10, 6);
        }

        // Pins
        if (BLACK === "black") {
          if (i <= 0 && j <= 0) {
            let val = PINS[(j + 1) * 2 + i + 1];
            pieces.push(
              f(circle(ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN, val ? WHITE : GRAY, 3))
            );

            let pinPiece = f(circle(ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN * 0.8, GRAY, 16));
            let pinPiece1 = f(circle(ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN * 0.8, BLACK, -139));
            let pin = new Piece([
              extrudeSticker(pinPiece.stickers[0], LAYER_V.mul(-123), true, true),
              extrudeSticker(pinPiece1.stickers[0], LAYER_V.mul(-123), true, true),
            ]);

            pin.stickers.forEach(st => {
              st.vecs = [RIGHT.clone()];
              st.name = "pin";
              st.userData = val;
            });

            if (val) {
              pin.rotate(new Vector3D(1000, 0, 0), UP, 0.0001, true);
            }

            pieces.push(pin);
          }
        }
      }
    }
  }

  function generatePieces() {
    pieces.length = 0;

    const PINS1 = pins.map((_, p: number) => !pins[((p >> 1) << 1) + 1 - (p & 1)]);
    const V1 = FRONT.mul(WIDTH);
    drawSingleClock(clocks[0], pins, "black", "white", "gray", true, (e: Piece) => e.add(V1, true));

    drawSingleClock(clocks[1], PINS1, "white", "black", "gray", false, (e: Piece) => {
      e.stickers.forEach(st => {
        st.points.forEach(pt => {
          pt.setCoords(-(pt.x + V1.x), pt.y + V1.y, -(pt.z + V1.z));
        });

        if (st instanceof FaceSticker) return;

        st.updateMassCenter();
      });
      return e;
    });

    pieces.forEach(pc =>
      pc.stickers.forEach(st => {
        if (st.nonInteractive) return;
        if (st instanceof FaceSticker) {
          st.vecs = [UP.clone()];
          return;
        }
        let v = st.getOrientation();
        v.setCoords(v.z, v.y, -v.x);
        st.vecs = [v];
      })
    );
  }

  generatePieces();

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
          pins[j] = pinCode & mask ? true : pins[j];
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

  let anchors: Vector3D[] = [];

  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      anchors.push(new Vector3D(X + W * i, Y + W * j));
    }
  }

  function getCoords(mc: Vector3D) {
    let minDist = 1 / 0;
    let pos = 0;
    let coords = [0, 0];

    for (let i = -1; i <= 1; i += 1) {
      for (let j = -1; j <= 1; j += 1) {
        let dist = anchors[pos].sub(mc).abs();
        if (dist < minDist) {
          minDist = dist;
          coords = [i, j];
        }

        pos += 1;
      }
    }

    return coords;
  }

  function getClosestDial(ct: Vector3D): Vector3D {
    let minDist = 1 / 0;
    let res = 0;

    for (let i = 0, maxi = anchors.length; i < maxi; i += 1) {
      let dist = ct.sub(anchors[i]).abs();

      if (dist < minDist) {
        minDist = dist;
        res = i;
      }
    }

    return anchors[res];
  }

  function getClocks(coords: number[]) {
    return [
      [coords[0], coords[1]],
      [0, coords[1]],
      [coords[0], 0],
      [0, 0],
    ];
  }

  clock.toMove = function (piece: Piece, sticker: Sticker) {
    let mc = sticker.getMassCenter();

    if (sticker.name === "pin") {
      let px = (Math.sign(mc.x) - 1) / 2;
      let py = (Math.sign(mc.y) - 1) / 2;
      let pos = (py + 1) * 2 + px + 1;
      pins[pos] = !pins[pos];
      sticker.userData = pins[pos];

      return {
        pieces: [piece],
        ang: 0.0001,
        dir: pins[pos] ? DOWN : UP,
        center: new Vector3D(1000, 0, 0),
      };
    }

    let coords = getCoords(mc);

    if (coords[0] === 0 || coords[1] === 0) return { pieces: [], ang: CLOCK_ANG };

    let pos = (coords[0] + 1) / 2 + coords[1] + 1;
    let arrows = pieces.filter(pc => pc.stickers.some(st => st.name === "arrow"));
    let u = sticker.getOrientation();
    let pinCoord = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];

    let arrowPieces: Piece[] = [];

    for (let i = 0; i < 4; i += 1) {
      if (pins[i] === pins[pos]) {
        let cd = getClocks(pinCoord[i]);
        arrowPieces = arrowPieces.concat(
          arrows.filter(pc => {
            let coord = pc.stickers[0].userData;
            let side = Math.sign(pc.stickers[0].getMassCenter().z);
            let pinMult = pins[pos] ? 1 : -1;

            if (Math.abs(coord[0]) === 1 && Math.abs(coord[1]) === 1) {
              return cd.some(c => c[0] === coord[0] * side && c[1] === coord[1]);
            }
            return (
              cd.some(c => c[0] === coord[0] * side && c[1] === coord[1]) && side * pinMult > 0
            );
          })
        );
      }
    }

    let idMap = new Set();

    arrowPieces = arrowPieces.filter(pc => {
      if (idMap.has(pc.id)) return false;
      idMap.add(pc.id);
      return true;
    });

    return arrowPieces.map(p => {
      let ct = p.stickers.find(st => st.name === "arrow")!.updateMassCenter();
      let dial = getClosestDial(ct);

      return {
        pieces: [p],
        ang: CLOCK_ANG,
        dir: u,
        center: dial.clone(),
      };
    });
  };

  clock.scramble = function () {
    clock.move(ScrambleParser.parseClock(getScramble()));
    generatePieces();
  };

  clock.applySequence = function (seq: string[]) {
    // let moves = seq.map(mv => ScrambleParser.parseNNN(mv, { a, b, c })[0]);
    let res: { u: Vector3D; ang: number; pieces: string[] }[] = [];
    console.log("SEQ: ", seq);

    // for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
    //   let pcs;

    //   try {
    //     pcs = trySingleMove(moves[i]);
    //   } catch (e) {
    //     console.log("ERROR: ", seq[i], moves[i], e);
    //   }

    //   if (!pcs) {
    //     continue;
    //   }

    //   let { u, ang } = pcs;

    //   res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });

    //   pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    // }

    return res;
  };

  clock.raw = [pins, clocks, anchors];

  return clock;
}
