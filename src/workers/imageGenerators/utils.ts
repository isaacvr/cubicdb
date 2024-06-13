import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { Vector2D } from "@classes/vector2-d";
import { Vector3D } from "@classes/vector3d";
import { CubeMode, getColorByName } from "@constants";
import { map } from "@helpers/math";

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
  stickers: Sticker[],
  sideStickers: Sticker[],
  W: number,
  H: number,
  cube: Puzzle
) {
  let _min = Math.min;
  let _max = Math.max;

  stickers.forEach((st, p) => (st.userData = p));
  sideStickers.forEach(st => (st.userData = null));

  let limits = [Infinity, -Infinity, Infinity, -Infinity];
  let allStickers = [...stickers, ...sideStickers].filter(st => st.getOrientation().z >= 0);

  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    let pts = allStickers[i].points;
    pts.forEach(p => {
      limits[0] = _min(limits[0], p.x);
      limits[1] = _max(limits[1], p.x);
      limits[2] = _min(limits[2], p.y);
      limits[3] = _max(limits[3], p.y);
    });
  }

  const PAD = 2;
  let v1 = new Vector2D(limits[0], limits[2]);
  let v2 = new Vector2D(limits[1], limits[3]);
  const F = _min((W - 2 * PAD) / (v2.x - v1.x), (H - 2 * PAD) / (v2.y - v1.y));
  let vdif = v2.sub(v1).mul(F);
  let offset = new Vector2D(W / 2, H / 2).sub(new Vector2D(vdif.x / 2, vdif.y / 2));

  if (cube.type === "supersquare1") {
    let x1 = map(-2, v1.x, v2.x, 0, vdif.x) + offset.x;
    let x2 = map(2, v1.x, v2.x, 0, vdif.x) + offset.x;
    let y = map(0, v1.y, v2.y, 0, vdif.y) + offset.y;

    ctx.moveTo(x1, H - y);
    ctx.lineTo(x2, H - y);
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.strokeStyle = "black";
  }

  allStickers.sort((a, b) => {
    let za = a.points.reduce((acc, e) => (acc.z > e.z ? acc : e), new Vector3D(0, 0, -1000));
    let zb = b.points.reduce((acc, e) => (acc.z > e.z ? acc : e), new Vector3D(0, 0, -1000));

    return za.z - zb.z;
  });

  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    let st = allStickers[i];
    ctx.fillStyle = cube.getHexStrColor(st.color);
    let pts = st.points;

    ctx.beginPath();

    if (ctx.setPosition && Number.isInteger(st.userData)) {
      ctx.setPosition(st.userData);
    }

    for (let j = 0, maxj = pts.length; j < maxj; j += 1) {
      let x = map(pts[j].x, v1.x, v2.x, 0, vdif.x) + offset.x;
      let y = map(pts[j].y, v1.y, v2.y, 0, vdif.y) + offset.y;
      if (j === 0) {
        ctx.moveTo(x, H - y);
      } else {
        ctx.lineTo(x, H - y);
      }
    }
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
  }

  // Show arrows
  let swaps = cube.arrows;

  const tipLength = 0.06 * Math.min(W, H);
  const tipAngle = Math.PI * 0.88;
  const elems = 5;
  const order = cube.order.a;
  const LW = Math.max(1, Math.min(W, H) / 200);

  let mapVector = (x: number, y: number) =>
    new Vector2D(
      map(x, v1.x, v2.x, 0, vdif.x) + offset.x,
      map(y, v1.y, v2.y, 0, vdif.y) + offset.y
    );

  let col = getTipColor(cube.mode);

  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1;

  for (let i = 0, maxi = ~~(swaps.length / elems) * elems; i < maxi; i += elems) {
    let x1 = swaps[i];
    let y1 = swaps[i + 1];
    let x2 = swaps[i + 2];
    let y2 = swaps[i + 3];
    let type = swaps[i + 4];
    let pos1 = x1 + y1 * order;
    let pos2 = x2 + y2 * order;

    if (pos1 >= stickers.length || pos2 >= stickers.length) {
      continue;
    }

    let c1 = stickers[pos1].getMassCenter();
    let c2 = stickers[pos2].getMassCenter();

    let ini = mapVector(c1.x, c1.y);
    let fin = mapVector(c2.x, c2.y);
    let tip = fin.sub(ini).unit().mul(tipLength);
    let tip1 = fin.add(tip.rot(tipAngle));
    let tip2 = fin.add(tip.rot(-tipAngle));
    let tip3 = ini.sub(tip.rot(tipAngle));
    let tip4 = ini.sub(tip.rot(-tipAngle));
    let m1 = tip1.add(tip2).div(2);
    let m2 = tip3.add(tip4).div(2);

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
