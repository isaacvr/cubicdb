import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners, roundStickerCorners } from "@classes/puzzle/puzzleUtils";
import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import type { PuzzleType } from "@interfaces";
import { drawStickers } from "./utils";
import { CanvasGenerator } from "./classes/CanvasGenerator";
import { SVGGenerator } from "./classes/SVGGenerator";
import { FaceSticker } from "@classes/puzzle/FaceSticker";

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
  const st1 = st._generator.clone();
  const points = st1.points;

  const pts = (st._generator.points as Vector3D[]).filter(p => {
    return Math.abs(p.y) >= threshold - EPS;
  });

  if (pts.length === 0) {
    return st;
  }

  // Divide by 2 the height of the sticker with anchor = pts[0]
  points.map(p => (p.y = (p.y + pts[0].y) / 2));
  st1.updateMassCenter();
  st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2, true);

  const f = points[0].y * st1.getOrientation().dot(UP);

  if (f < 0) {
    st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2 * 2, true);
  }

  const ini = f > 0 ? 1 : 2;

  for (let j = ini; j <= ini + 1; j += 1) {
    const pj = points[j].clone();
    pj.y = 0;

    const anchors = pj.abs() > 1.5 ? SQ1_A2 : SQ1_A1;

    anchors.sort((a, b) => a.sub(pj).abs() - b.sub(pj).abs());

    const closer = anchors[0];
    points[j].x = closer.x;
    points[j].z = closer.z;
  }

  const rp = cube.p.roundParams;
  const rounded = cube.p.isRounded ? roundStickerCorners(st1, rp.rd, rp.scale, rp.ppc, true) : st1;
  rounded.color = st.color;
  rounded.oColor = st.oColor;

  return rounded;
}

interface PROJECTED_VIEW_ARGS {
  cube: Puzzle;
  DIM: number;
  format?: "raster" | "svg";
  printMode?: boolean;
}

export function projectedView({
  cube,
  DIM,
  format = "svg",
  printMode = false,
}: PROJECTED_VIEW_ARGS): string {
  let W = (DIM * 4) / 2;
  let H = (DIM * 3) / 2;
  const FACTOR = 2.1;
  let LW = DIM * (printMode ? 0.01 : 0.007);
  const SPECIAL_SQ1 = [CubeMode.CS, CubeMode.EO, CubeMode.CO];
  const ORDER = cube.order;

  if (cube.options.rounded) {
    roundCorners({ p: cube.p, ...cube.p.roundParams, calcPath: true });
  }

  const getFactor = () => {
    if (
      (cube.type === "square1" || cube.type === "square2") &&
      SPECIAL_SQ1.some(m => m === cube.mode)
    ) {
      return 1.6;
    }

    return FACTOR;
  };

  // Set dimensions
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
  } else if (cube.type === "clock") {
    H = DIM;
  } else if (cube.type === "fto") {
    H = W * 0.5;
  }

  const ctx = format === "raster" ? new CanvasGenerator(W, H) : new SVGGenerator(W, H);
  ctx.lineWidth = LW;

  let colorFilter = ["d"];

  if (cube.type === "square1" || cube.type === "square2" || cube.mode === CubeMode.NORMAL) {
    colorFilter.push("x");
  }

  if (cube.type === "supersquare1") {
    colorFilter = ["d"];
  }

  const stickers = cube.getAllStickers().filter(s => {
    if (cube.type === "clock") return !(s instanceof FaceSticker);
    return colorFilter.indexOf(s.color) === -1;
  });

  const sideStk: { [name: string]: Sticker[] } = {};

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
  const SQ1_A1: Vector3D[] = [];
  const SQ1_A2: Vector3D[] = [];

  for (let i = 0; i < 12; i += 1) {
    SQ1_A1.push(BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.38036823524362));
    SQ1_A2.push(BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.88561808632825));
  }

  // Set face names and transformations
  if (cube.type === "pyraminx") {
    faceName = ["F", "R", "D", "L"];
  } else if (cube.type === "square1" || cube.type === "square2") {
    faceVectors = [UP, DOWN, RIGHT.add(BACK).add(UP)];
    faceName = ["U", "D", "M"];
  } else if (cube.type === "megaminx" || cube.type === "pyraminxCrystal") {
    const raw = cube.p.raw;
    const ac = raw[0];
    const FACE_ANG = raw[1];
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
  } else if (cube.type === "fto") {
    faceName = ["F1", "F2", "F3", "F4", "B1", "B2", "B3", "B4"];
    fcTr = [];

    for (let i = 0; i < 8; i += 1) {
      fcTr.push([CENTER, RIGHT, Math.asin(0.5773502691896258), CENTER, 0]);
    }
  } else if (cube.type === "rubik") {
    const unit = 2 / Math.max(ORDER.a, ORDER.b, ORDER.c);
    const sideMult = ORDER.a === 3 && ORDER.b === 1 && ORDER.c === 3 ? 2 : 1;
    const offset = printMode ? 0.5 : 1;

    fcTr = [
      // rotate([0], [1], [2]).add([3].mul([4]))
      [CENTER, RIGHT, PI_2, UP, (sideMult * unit * (ORDER.b + ORDER.c + offset)) / 2],
      [CENTER, UP, -PI_2, RIGHT, (sideMult * unit * (ORDER.a + ORDER.b + offset)) / 2],
      [CENTER, RIGHT, 0, UP, 0], /// F = no transform
      [CENTER, LEFT, PI_2, DOWN, (sideMult * unit * (ORDER.b + ORDER.c + offset)) / 2],
      [CENTER, UP, PI_2, LEFT, (sideMult * unit * (ORDER.a + ORDER.b + offset)) / 2],
      [CENTER, UP, PI, RIGHT, sideMult * unit * (ORDER.a + ORDER.b + offset)],
    ];
  } else if (cube.type === "clock") {
    faceName = ["FRONT", "BACK"];
    fcTr = [
      [CENTER, UP, 0, UP, 0], // NO action
      [CENTER, UP, PI, RIGHT, 1],
    ];
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
    "fto",
  ];

  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    const st = stickers[i];
    let uv = st.getOrientation();
    const mc = st.getMassCenter();
    let ok = false;
    const off1 = new Vector3D(-2, 2, 0);
    const off2 = new Vector3D(2, 2, 0);

    if (cube.type === "supersquare1") {
      if (mc.y > 0.7) {
        const newst = UP.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2) : st;
        sideStk["U"].push(newst.rotate(CENTER, RIGHT, PI_2, true).add(off1, true));
      } else if (mc.y > 0.2) {
        if (!(st.color != "x" || (st.color === "x" && uv.y > 0))) continue;
        const newst = UP.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2, 0.5) : st;
        sideStk["U1"].push(newst.rotate(CENTER, RIGHT, PI_2, true).add(off2, true));
      } else if (mc.y < -0.6) {
        const newst = DOWN.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2) : st;
        sideStk["D"].push(
          newst.rotate(CENTER, RIGHT, -PI_2, true).add(off1.rotate(CENTER, FRONT, PI), true)
        );
      } else if (mc.y < -0.2) {
        if (!(st.color != "x" || (st.color === "x" && uv.y < 0))) continue;

        const newst = DOWN.dot(uv) < EPS ? getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2, 0.5) : st;
        sideStk["D1"].push(
          newst.rotate(CENTER, RIGHT, -PI_2, true).add(off2.rotate(CENTER, FRONT, PI), true)
        );
      } //*/

      continue;
    }

    if (cube.type === "gear") {
      uv = [UP, FRONT, RIGHT, LEFT, BACK, DOWN].sort((a, b) => b.dot(uv) - a.dot(uv))[0];
    }

    if (cube.type === "clock" && st.name === "pin") {
      const ori = st.getOrientation();
      const face = ori.z > 0 ? 0 : 1;
      const on = Math.abs(st.getMassCenter().z) > 0.27;

      const arr = sideStk[faceName[face]];

      sideStk[faceName[face]].push(st);

      const onColor = "black";
      const offColor = "gray";

      arr[arr.length - 1].color = on ? onColor : offColor;

      continue;
    }

    // Find the face of the sticker
    for (let j = 0, maxj = faceVectors.length; j < maxj && !ok; j += 1) {
      if (faceVectors[j].sub(uv).abs() < EPS) {
        if (normalCubes.indexOf(cube.type) > -1) {
          sideStk[faceName[j]].push(
            st
              .rotate(fcTr[j][0], fcTr[j][1], fcTr[j][2], true)
              .add(fcTr[j][3].mul(fcTr[j][4]), true)
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
      const allPts = st._generator.points as Vector3D[];
      const pts = allPts.filter(p => {
        return Math.abs(p.y) >= 1 - EPS;
      });

      if (pts.length > 0) {
        if (!SPECIAL_SQ1.some(m => cube.mode === m)) {
          const rounded = getRoundedSQ1Sticker(cube, st, SQ1_A1, SQ1_A2);

          if (pts[0].y > 0) {
            sideStk.U.push(rounded);
          } else {
            sideStk.D.push(rounded);
          }
        }
      } else {
        const isFront = allPts.reduce((ac, p) => ac && p.z >= 1, true);

        if (isFront) {
          const st1 = st.clone();
          const f = SPECIAL_SQ1.some(m => m === cube.mode) ? 1 : 4 / 3;
          (st1.points as Vector3D[]).forEach(p => {
            p.y /= 2;
            p.x *= f;
          });
          sideStk.M.push(st1);
        }
      }
    }
  }

  if (cube.type === "pyraminx") {
    const PU = UP.mul(1.59217);
    const PR = DOWN.mul(0.53072).add(FRONT.mul(1.5011)).rotate(CENTER, UP, PI_3);
    const PB = PR.rotate(CENTER, UP, 2 * PI_3);
    const PL = PB.rotate(CENTER, UP, 2 * PI_3);
    const MLR = PL.add(PR).div(2);

    const ANG = 0.4048928432892675;
    const ANG1 = PI_2 + ANG;

    sideStk.F.forEach(s => s.rotate(MLR, RIGHT, ANG, true));
    sideStk.R.forEach(s => s.rotate(PR, PR.sub(PU), ANG1, true).rotate(MLR, RIGHT, ANG, true));
    sideStk.D.forEach(s => s.rotate(PR, PL.sub(PR), ANG1, true).rotate(MLR, RIGHT, ANG, true));
    sideStk.L.forEach(s => s.rotate(PU, PU.sub(PL), ANG1, true).rotate(MLR, RIGHT, ANG, true));

    const cm1 = sideStk.R.reduce((a, s) => a.add(s.getMassCenter(), true), new Vector3D())
      .div(sideStk.R.length, true)
      .setLength(0.15);
    const cm2 = sideStk.D.reduce((a, s) => a.add(s.getMassCenter(), true), new Vector3D())
      .div(sideStk.D.length, true)
      .setLength(0.15);
    const cm3 = sideStk.L.reduce((a, s) => a.add(s.getMassCenter(), true), new Vector3D())
      .div(sideStk.L.length, true)
      .setLength(0.15);

    sideStk.R.forEach(s => s.add(cm1, true));
    sideStk.D.forEach(s => s.add(cm2, true));
    sideStk.L.forEach(s => s.add(cm3, true));
  } else if (cube.type === "square1" || cube.type === "square2") {
    sideStk.U.forEach(st => st.rotate(CENTER, RIGHT, PI_2, true).add(UP.mul(getFactor()), true));
    sideStk.D.forEach(st => st.rotate(CENTER, RIGHT, -PI_2, true).add(DOWN.mul(getFactor()), true));
  } else if (cube.type === "megaminx" || cube.type === "pyraminxCrystal") {
    const raw = cube.p.raw;
    const FACE_ANG = raw[1];

    for (let i = 0; i < 6; i += 1) {
      sideStk[faceName[i]].forEach(s => s.rotate(CENTER, RIGHT, PI_2, true));
    }

    // Get points of the bottom center
    const downPts: Vector3D[] =
      cube.type === "megaminx"
        ? cube.p.pieces.filter(p => {
            if (p.stickers.length < 2) return false;
            if (p.stickers.some(st => st.name === "center")) {
              const st = p.stickers.filter(st => st.name === "center")[0];
              return st.name === "center" && st.getOrientation().sub(DOWN).abs() < EPS;
            }

            return false;
          })[0].stickers[1].points
        : raw[5];

    const vec = new Vector3D(3.53, -0.38, 0);

    for (let i = 6; i < 12; i += 1) {
      const stickers = sideStk[faceName[i]];
      const o = stickers[0].getOrientation();

      if (o.sub(DOWN).abs() < EPS) {
        stickers.forEach(s =>
          s.rotate(CENTER, FRONT, PI, true).rotate(CENTER, RIGHT, PI_2, true).add(vec, true)
        );

        continue;
      }

      for (let j = 0, maxj = downPts.length; j < maxj; j += 1) {
        const v = downPts[(j + 1) % maxj].sub(downPts[j]);

        if (Math.abs(v.dot(o)) < EPS) {
          const anchor = stickers
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
  } else if (cube.type === "fto") {
    faceName
      .slice(4)
      .forEach(name =>
        sideStk[name].forEach(st => st.rotate(RIGHT.mul(printMode ? 1 : 1.1), UP, PI, true))
      );
  } else if (cube.type === "clock") {
    sideStk[faceName[1]].forEach(st => st.rotate(RIGHT.mul(1.1), UP, PI, true));
  }

  const allStickers: Sticker[] = [];

  for (let i = 0, maxi = faceName.length; i < maxi; i += 1) {
    allStickers.push(...sideStk[faceName[i]]);
  }

  drawStickers(ctx, allStickers, [], W, H, cube);

  if (cube.type === "megaminx") {
    const LX = W * 0.258;
    const LY = H * 0.457;
    const fontWeight = W * 0.05;

    const upVector = cube.p.faceVectors[0];
    const frontVector = cube.p.faceVectors[3];

    const cc = cube.p.getAllStickers().filter(st => st.name === "center-colored");
    const hToArr = (s: string) =>
      s
        .slice(1)
        .match(/.{2}/g)
        ?.map(n => parseInt(n, 16)) || [0, 0, 0];

    const upColor = hToArr(
      cube.getHexStrColor(
        cc
          .filter(st => st.getOrientation().sub(upVector).abs() < EPS)
          .map(st => st._generated.color)[0]
      )
    );

    const frontColor = hToArr(
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
