import type { BezierCurve } from "@classes/puzzle/BezierCurve";
import { BezierSticker } from "@classes/puzzle/BezierSticker";
import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { Vector2D } from "@classes/vector2-d";
import { Vector3D } from "@classes/vector3d";
import { CubeMode, getColorByName } from "@constants";
import { map } from "@helpers/math";
import { CanvasGenerator } from "./classes/CanvasGenerator";

export interface IDrawer {
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => any;
  beginPath: () => any;
  fill: () => any;
  closePath: () => any;
  setPosition?: (p: number) => any;
  arc: (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ) => void;
  quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void;
  bezierCurveTo: (
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ) => void;

  circle: (x: number, y: number, r: number) => void;

  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: "butt" | "round" | "square";
}

function getTipColor(mode: CubeMode): string {
  switch (mode) {
    case CubeMode.DPLL: {
      return getColorByName("white");
    }

    default: {
      return getColorByName("black");
    }
  }
}

export function drawStickers(
  ctx: IDrawer,
  stickers: Sticker[] | BezierSticker[],
  sideStickers: Sticker[] | BezierSticker[],
  W: number,
  H: number,
  cube: Puzzle
) {
  const _min = Math.min;
  const _max = Math.max;

  stickers.forEach((st, p) => (st.userData = p));
  sideStickers.forEach(st => (st.userData = null));

  const limits = [Infinity, -Infinity, Infinity, -Infinity];
  const allStickers = [...stickers, ...sideStickers].filter(st => st.getOrientation().z >= 0);

  if (allStickers.length === 0) return;

  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    const pts = allStickers[i].points;
    pts.forEach(p => {
      limits[0] = _min(limits[0], p.x);
      limits[1] = _max(limits[1], p.x);
      limits[2] = _min(limits[2], p.y);
      limits[3] = _max(limits[3], p.y);
    });
  }

  const PAD = 2;
  const v1 = new Vector2D(limits[0], limits[2]);
  const v2 = new Vector2D(limits[1], limits[3]);
  const F = _min((W - 2 * PAD) / (v2.x - v1.x), (H - 2 * PAD) / (v2.y - v1.y));
  const vdif = v2.sub(v1).mul(F);
  const offset = new Vector2D(W / 2, H / 2).sub(new Vector2D(vdif.x / 2, vdif.y / 2));

  if (cube.type === "supersquare1") {
    const x1 = map(-2, v1.x, v2.x, 0, vdif.x) + offset.x;
    const x2 = map(2, v1.x, v2.x, 0, vdif.x) + offset.x;
    const y = map(0, v1.y, v2.y, 0, vdif.y) + offset.y;

    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(x1, H - y);
    ctx.lineTo(x2, H - y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
    ctx.strokeStyle = "black";
  }

  allStickers.sort((a, b) => {
    if (cube.type === "clock") {
      if (a.name === "pin" && b.name === "pin") {
        return 0;
      }

      if (a.name === "pin") {
        return 1;
      }

      if (b.name === "pin") {
        return -1;
      }
    }

    const za = a.points.reduce((acc, e) => (acc.z > e.z ? acc : e), new Vector3D(0, 0, -1000));
    const zb = b.points.reduce((acc, e) => (acc.z > e.z ? acc : e), new Vector3D(0, 0, -1000));

    return za.z - zb.z;
  });

  const mapVector = (x: number, y: number, flipY = false) => {
    const nx = map(x, v1.x, v2.x, 0, vdif.x) + offset.x;
    const ny = map(y, v1.y, v2.y, 0, vdif.y) + offset.y;

    return new Vector2D(nx, flipY ? H - ny : ny);
  };

  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    const st = allStickers[i];
    ctx.fillStyle = cube.getHexStrColor(st.color);

    if (cube.type === "clock") {
      if (st.name != "pin") {
        ctx.strokeStyle = "transparent";
      } else {
        ctx.strokeStyle = "gray";
      }
    }

    if (st.name === "circle" || st.name === "pin") {
      const mc = st.updateMassCenter();
      const rad = mc.sub(st.points[0]).abs();

      const { x, y } = mapVector(mc.x, mc.y, true);

      const r = mapVector(mc.x + rad, 0).x - x;

      if (ctx instanceof CanvasGenerator) {
        ctx.beginPath();
        ctx.circle(x, y, r);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
      } else {
        ctx.circle(x, y, r);
      }
      continue;
    }

    const pts = st instanceof BezierSticker ? st.parts : st.points;

    ctx.beginPath();

    if (ctx.setPosition && Number.isInteger(st.userData)) {
      ctx.setPosition(st.userData);
    }

    for (let j = 0, maxj = pts.length; j < maxj; j += 1) {
      if (pts[j] instanceof Vector3D) {
        const pt = pts[j] as Vector3D;

        const x = map(pt.x, v1.x, v2.x, 0, vdif.x) + offset.x;
        const y = H - map(pt.y, v1.y, v2.y, 0, vdif.y) - offset.y;
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        const bz = pts[j] as BezierCurve;
        const pts1 = bz.anchors.map(a => ({
          x: map(a.x, v1.x, v2.x, 0, vdif.x) + offset.x,
          y: H - map(a.y, v1.y, v2.y, 0, vdif.y) - offset.y,
        }));

        if (j === 0) {
          ctx.moveTo(pts1[0].x, pts1[0].y);
        } else {
          ctx.lineTo(pts1[0].x, pts1[0].y);
        }

        if (pts1.length === 3) {
          ctx.quadraticCurveTo(pts1[1].x, pts1[1].y, pts1[2].x, pts1[2].y);
        } else {
          ctx.bezierCurveTo(pts1[1].x, pts1[1].y, pts1[2].x, pts1[2].y, pts1[3].x, pts1[3].y);
        }
      }
    }
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
  }

  // Show arrows
  const swaps = cube.arrows;

  const tipLength = 0.06 * Math.min(W, H);
  const tipAngle = Math.PI * 0.88;
  const elems = 5;
  const order = cube.order.a;
  const LW = Math.max(1, Math.min(W, H) / 200);

  const col = getTipColor(cube.mode);

  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1;

  for (let i = 0, maxi = ~~(swaps.length / elems) * elems; i < maxi; i += elems) {
    const x1 = swaps[i];
    const y1 = swaps[i + 1];
    const x2 = swaps[i + 2];
    const y2 = swaps[i + 3];
    const type = swaps[i + 4];
    const pos1 = x1 + y1 * order;
    const pos2 = x2 + y2 * order;

    if (pos1 >= stickers.length || pos2 >= stickers.length) {
      continue;
    }

    const c1 = stickers[pos1].getMassCenter();
    const c2 = stickers[pos2].getMassCenter();

    const ini = mapVector(c1.x, c1.y);
    const fin = mapVector(c2.x, c2.y);
    const tip = fin.sub(ini).unit().mul(tipLength);
    const tip1 = fin.add(tip.rot(tipAngle));
    const tip2 = fin.add(tip.rot(-tipAngle));
    const tip3 = ini.sub(tip.rot(tipAngle));
    const tip4 = ini.sub(tip.rot(-tipAngle));
    const m1 = tip1.add(tip2).div(2);
    const m2 = tip3.add(tip4).div(2);

    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(fin.x, H - fin.y);
    ctx.lineTo(tip1.x, H - tip1.y);
    ctx.lineTo(tip2.x, H - tip2.y);
    ctx.fill();
    ctx.closePath();

    if (type != 0) {
      ctx.beginPath();
      ctx.moveTo(ini.x, H - ini.y);
      ctx.lineTo(tip3.x, H - tip3.y);
      ctx.lineTo(tip4.x, H - tip4.y);
      ctx.fill();
      ctx.closePath();
    }

    ctx.lineWidth = LW * 2;
    ctx.lineCap = "square";

    ctx.beginPath();
    ctx.moveTo(m1.x, H - m1.y);
    ctx.lineTo(type ? m2.x : ini.x, H - (type ? m2.y : ini.y));
    ctx.stroke();
  }
}
