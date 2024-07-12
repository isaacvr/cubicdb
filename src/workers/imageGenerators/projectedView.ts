import type { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundStickerCorners } from "@classes/puzzle/puzzleUtils";
import { Vector2D } from "@classes/vector2-d";
import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import type { PuzzleType } from "@interfaces";
import { drawStickers } from "./utils";
import { getColoredFromList } from "@classes/reconstructors/utils";
import { CanvasGenerator } from "./classes/CanvasGenerator";
import { SVGGenerator } from "./classes/SVGGenerator";

const PI = Math.PI;
const PI_2 = PI / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

function getRoundedSQ1Sticker(
  cube: Puzzle,
  st: Sticker,
  SQ1_A1: Vector3D[],
  SQ1_A2: Vector3D[],
  threshold = 1
): Sticker {
  let st1 = st._generator.clone();
  let pts = st._generator.points.filter(p => {
    return Math.abs(p.y) >= threshold - EPS;
  });

  if (pts.length === 0) {
    return st;
  }

  // Divide by 2 the height of the sticker with anchor = pts[0]
  st1.points.map(p => (p.y = (p.y + pts[0].y) / 2));
  st1.updateMassCenter();
  st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2, true);

  let f = st1.points[0].y * st1.getOrientation().dot(UP);

  if (f < 0) {
    st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2 * 2, true);
  }

  let points = st1.points;
  let ini = f > 0 ? 1 : 2;

  for (let j = ini; j <= ini + 1; j += 1) {
    let pj = points[j].clone();
    pj.y = 0;

    let anchors = pj.abs() > 1.5 ? SQ1_A2 : SQ1_A1;

    anchors.sort((a, b) => a.sub(pj).abs() - b.sub(pj).abs());

    let closer = anchors[0];
    points[j].x = closer.x;
    points[j].z = closer.z;
  }

  let rounded = cube.p.isRounded ? roundStickerCorners(st1, ...cube.p.roundParams) : st1;
  rounded.color = st.color;
  rounded.oColor = st.oColor;

  return rounded;
}

export function projectedView(cube: Puzzle, DIM: number, format: "raster" | "svg" = "svg"): string {
  // const canvas = document.createElement("canvas");
  // const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  let W = (DIM * 4) / 2;
  let H = (DIM * 3) / 2;
  const FACTOR = 2.1;
  let LW = DIM * 0.007;
  const SPECIAL_SQ1 = [CubeMode.CS, CubeMode.EO, CubeMode.CO];

  const getFactor = () => {
    if (
      (cube.type === "square1" || cube.type === "square2") &&
      SPECIAL_SQ1.some(m => m === cube.mode)
    ) {
      return 1.6;
    }

    return FACTOR;
  };

  if (cube.type === "pyraminx") {
    H = W / 1.1363636363636365;
  } else if (cube.type === "square1" || cube.type === "square2") {
    W += H; // swap W and H
    H = W - H;
    W = W - H;
    W *= 0.62;
  } else if (cube.type === "megaminx" || cube.type === "pyraminxCrystal") {
    W = H * 2;
    LW = H * 0.004;
  } else if (cube.type === "supersquare1") {
    H = W;
  }

  let ctx = format === "raster" ? new CanvasGenerator(W, H) : new SVGGenerator(W, H);
  ctx.lineWidth = LW;

  let colorFilter = ["d"];

  if (cube.type === "square1" || cube.type === "square2" || cube.mode === CubeMode.NORMAL) {
    colorFilter.push("x");
  }

  if (cube.type === "supersquare1") {
    colorFilter = ["d"];
  }

  let stickers = cube.getAllStickers().filter(s => colorFilter.indexOf(s.color) === -1);

  let sideStk: { [name: string]: Sticker[] } = {};

  let faceVectors = cube.p.faceVectors;
  let faceName = ["U", "R", "F", "D", "L", "B"];
  let fcTr: any[] = [
    // rotate([0], [1], [2]).add([3].mul([4]))
    [CENTER, RIGHT, PI_2, UP, FACTOR],
    [CENTER, UP, -PI_2, RIGHT, FACTOR],
    [CENTER, RIGHT, 0, UP, 0], /// F = no transform
    [CENTER, LEFT, PI_2, DOWN, FACTOR],
    [CENTER, UP, PI_2, LEFT, FACTOR],
    [CENTER, UP, PI, RIGHT, FACTOR * 2],
  ];

  // Square-1 anchors
  let SQ1_A1: Vector3D[] = [];
  let SQ1_A2: Vector3D[] = [];

  for (let i = 0; i < 12; i += 1) {
    SQ1_A1.push(BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.38036823524362));
    SQ1_A2.push(BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.88561808632825));
  }

  if (cube.type === "pyraminx") {
    faceName = ["F", "R", "D", "L"];
  } else if (cube.type === "square1" || cube.type === "square2") {
    faceVectors = [UP, DOWN, RIGHT.add(BACK).add(UP)];
    faceName = ["U", "D", "M"];
  } else if (cube.type === "megaminx" || cube.type === "pyraminxCrystal") {
    let raw = cube.p.raw;
    let ac = raw[0];
    let FACE_ANG = raw[1];
    faceName = ["U", "MU1", "MU2", "MU3", "MU4", "MU5", "MD1", "MD2", "MD3", "MD4", "MD5", "D"];
    fcTr = [
      [CENTER, UP, 0, UP, 0], /// no transform
    ];

    for (let i = 0; i < 5; i += 1) {
      fcTr.push([ac[i % 5], ac[(i + 1) % 5].sub(ac[i % 5]), FACE_ANG - PI, UP, 0]);
    }

    for (let i = 0; i < 6; i += 1) {
      fcTr.push([CENTER, UP, 0, UP, 0]);
    }
  } else if (cube.type === "supersquare1") {
    faceName = ["U", "U1", "D1", "D"];
  }

  for (let i = 0, maxi = faceName.length; i < maxi; i += 1) {
    sideStk[faceName[i]] = [];
  }

  const normalCubes: PuzzleType[] = [
    "rubik",
    "bicube",
    "gear",
    "ivy",
    "skewb",
    "megaminx",
    "pyraminxCrystal",
    "redi",
    "helicopter",
  ];

  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    let st = stickers[i];
    let uv = st.getOrientation();
    let mc = st.getMassCenter();
    let ok = false;
    let off1 = new Vector3D(-2, 2, 0);
    let off2 = new Vector3D(2, 2, 0);

    if (cube.type === "supersquare1") {
      if (mc.y > 0.7) {
        let newst = UP.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2) : st;
        sideStk["U"].push(newst.rotate(CENTER, RIGHT, PI_2).add(off1));
      } else if (mc.y > 0.2) {
        if (!(st.color != "x" || (st.color === "x" && uv.y > 0))) continue;
        let newst = UP.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2, 0.5) : st;
        sideStk["U1"].push(newst.rotate(CENTER, RIGHT, PI_2).add(off2));
      } else if (mc.y < -0.6) {
        let newst = DOWN.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2) : st;
        sideStk["D"].push(newst.rotate(CENTER, RIGHT, -PI_2).add(off1.rotate(CENTER, FRONT, PI)));
      } else if (mc.y < -0.2) {
        if (!(st.color != "x" || (st.color === "x" && uv.y < 0))) continue;

        let newst = DOWN.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2, 0.5) : st;
        sideStk["D1"].push(newst.rotate(CENTER, RIGHT, -PI_2).add(off2.rotate(CENTER, FRONT, PI)));
      } //*/

      continue;
    }

    if (cube.type === "gear") {
      uv = [UP, FRONT, RIGHT, LEFT, BACK, DOWN].sort((a, b) => b.dot(uv) - a.dot(uv))[0];
    }

    // Find the face of the sticker
    for (let j = 0, maxj = faceVectors.length; j < maxj && !ok; j += 1) {
      if (faceVectors[j].sub(uv).abs() < EPS) {
        if (normalCubes.indexOf(cube.type) > -1) {
          sideStk[faceName[j]].push(
            st.rotate(fcTr[j][0], fcTr[j][1], fcTr[j][2]).add(fcTr[j][3].mul(fcTr[j][4]))
          );
        } else {
          sideStk[faceName[j]].push(st);
        }
        ok = true;
      }
    }

    if (ok) continue;

    if (
      (cube.type === "square1" || cube.type === "square2") &&
      st.color != "d" &&
      st.color != "x"
    ) {
      let pts = st._generator.points.filter(p => {
        return Math.abs(p.y) >= 1 - EPS;
      });

      if (pts.length > 0) {
        if (!SPECIAL_SQ1.some(m => cube.mode === m)) {
          let rounded = getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2);

          if (pts[0].y > 0) {
            sideStk.U.push(rounded);
          } else {
            sideStk.D.push(rounded);
          }
        }
      } else {
        let isFront = st._generator.points.reduce((ac, p) => ac && p.z >= 1, true);

        if (isFront) {
          let st1 = st.clone();
          let f = SPECIAL_SQ1.some(m => m === cube.mode) ? 1 : 4 / 3;
          st1.points.map(p => {
            p.y /= 2;
            p.x *= f;
          });
          sideStk.M.push(st1);
        }
      }
    }
  }

  if (cube.type === "pyraminx") {
    let PU = UP.mul(1.59217);
    let PR = DOWN.mul(0.53072).add(FRONT.mul(1.5011)).rotate(CENTER, UP, PI_3);
    let PB = PR.rotate(CENTER, UP, 2 * PI_3);
    let PL = PB.rotate(CENTER, UP, 2 * PI_3);
    let MLR = PL.add(PR).div(2);

    const ANG = 0.4048928432892675;
    const ANG1 = PI_2 + ANG;

    sideStk.F = sideStk.F.map(s => s.rotate(MLR, RIGHT, ANG));
    sideStk.R = sideStk.R.map(s => s.rotate(PR, PR.sub(PU), ANG1).rotate(MLR, RIGHT, ANG));
    sideStk.D = sideStk.D.map(s => s.rotate(PR, PL.sub(PR), ANG1).rotate(MLR, RIGHT, ANG));
    sideStk.L = sideStk.L.map(s => s.rotate(PU, PU.sub(PL), ANG1).rotate(MLR, RIGHT, ANG));

    let cm1 = sideStk.R.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D())
      .div(sideStk.R.length)
      .setLength(0.15);
    let cm2 = sideStk.D.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D())
      .div(sideStk.D.length)
      .setLength(0.15);
    let cm3 = sideStk.L.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D())
      .div(sideStk.L.length)
      .setLength(0.15);

    sideStk.R = sideStk.R.map(s => s.add(cm1));
    sideStk.D = sideStk.D.map(s => s.add(cm2));
    sideStk.L = sideStk.L.map(s => s.add(cm3));
  } else if (cube.type === "square1" || cube.type === "square2") {
    sideStk.U = sideStk.U.map(st => st.rotate(CENTER, RIGHT, PI_2).add(UP.mul(getFactor())));
    sideStk.D = sideStk.D.map(st => st.rotate(CENTER, RIGHT, -PI_2).add(DOWN.mul(getFactor())));
  } else if (cube.type === "megaminx" || cube.type === "pyraminxCrystal") {
    let raw = cube.p.raw;
    let FACE_ANG = raw[1];

    for (let i = 0; i < 6; i += 1) {
      sideStk[faceName[i]].forEach(s => s.rotate(CENTER, RIGHT, PI_2, true));
    }

    // Get points of the bottom center
    const downPts: Vector3D[] =
      cube.type === "megaminx"
        ? cube.p.pieces.filter(p => {
            if (p.stickers.length < 2) return false;
            if (p.stickers.some(st => st.name === "center")) {
              let st = p.stickers.filter(st => st.name === "center")[0];
              return st.name === "center" && st.getOrientation().sub(DOWN).abs() < EPS;
            }

            return false;
          })[0].stickers[1].points
        : raw[5];

    const vec = new Vector3D(3.53, -0.38, 0);

    for (let i = 6; i < 12; i += 1) {
      let stickers = sideStk[faceName[i]];
      let o = stickers[0].getOrientation();

      if (o.sub(DOWN).abs() < EPS) {
        stickers.forEach(s =>
          s.rotate(CENTER, FRONT, PI, true).rotate(CENTER, RIGHT, PI_2, true).add(vec, true)
        );

        continue;
      }

      for (let j = 0, maxj = downPts.length; j < maxj; j += 1) {
        let v = downPts[(j + 1) % maxj].sub(downPts[j]);

        if (Math.abs(v.dot(o)) < EPS) {
          let anchor = stickers
            .reduce((acc: Vector3D[], s) => [...acc, ...s.points], [])
            .sort((a, b) => {
              return a.y - b.y;
            })[0]
            .clone();

          stickers.forEach(s =>
            s
              .rotate(anchor, v, FACE_ANG - PI, true)
              .rotate(CENTER, FRONT, PI, true)
              .rotate(CENTER, RIGHT, PI_2, true)
              .add(vec, true)
          );
          break;
        }
      }
    }
  }

  let allStickers: Sticker[] = [];

  for (let i = 0, maxi = faceName.length; i < maxi; i += 1) {
    allStickers.push(...sideStk[faceName[i]]);
  }

  drawStickers(ctx, allStickers, [], W, H, cube);

  if (cube.type === "megaminx") {
    let LX = W * 0.258;
    let LY = H * 0.457;
    let fontWeight = W * 0.05;

    let upVector = cube.p.faceVectors[0];
    let frontVector = cube.p.faceVectors[3];

    let cc = cube.p.getAllStickers().filter(st => st.name === "center-colored");
    let hToArr = (s: string) =>
      s
        .slice(1)
        .match(/.{2}/g)
        ?.map(n => parseInt(n, 16)) || [0, 0, 0];

    let upColor = hToArr(
      cube.getHexStrColor(
        cc
          .filter(st => st.getOrientation().sub(upVector).abs() < EPS)
          .map(st => st._generated.color)[0]
      )
    );

    let frontColor = hToArr(
      cube.getHexStrColor(
        cc
          .filter(st => st.getOrientation().sub(frontVector).abs() < EPS)
          .map(st => st._generated.color)[0]
      )
    );

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgb(${255 - upColor[0]}, ${255 - upColor[1]}, ${255 - upColor[2]})`;
    ctx.font = fontWeight + "px verdana, sans-serif";
    ctx.fillText("U", LX, LY);
    ctx.fillStyle = `rgb(${255 - frontColor[0]}, ${255 - frontColor[1]}, ${255 - frontColor[2]})`;
    ctx.fillText("F", LX, LY * 1.75);
  }

  return ctx.getImage();
}
