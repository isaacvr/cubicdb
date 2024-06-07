import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { Vector2D } from "@classes/vector2-d";
import { Vector3D } from "@classes/vector3d";
import { map } from "@helpers/math";

export function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: Sticker[],
  sideStickers: Sticker[],
  W: number,
  H: number,
  cube: Puzzle
) {
  let _min = Math.min;
  let _max = Math.max;

  let limits = [Infinity, -Infinity, Infinity, -Infinity];
  let allStickers = [...stickers, ...sideStickers];

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
  const F = _min((W - 2 * PAD) / (limits[1] - limits[0]), (H - 2 * PAD) / (limits[3] - limits[2]));
  let v1 = new Vector2D(limits[0], limits[2]);
  let v2 = new Vector2D(limits[1], limits[3]);
  let vdif = v2.sub(v1).mul(F);
  let offset = new Vector2D(W / 2, H / 2).sub(new Vector2D(vdif.x / 2, vdif.y / 2));

  if (cube.type === "supersquare1") {
    let x1 = map(-2, limits[0], limits[1], 0, vdif.x) + offset.x;
    let x2 = map(2, limits[0], limits[1], 0, vdif.x) + offset.x;
    let y = map(0, limits[2], limits[3], 0, vdif.y) + offset.y;

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
    ctx.fillStyle = cube.getHexStrColor(allStickers[i].color);
    let pts = allStickers[i].points;

    ctx.beginPath();

    for (let j = 0, maxj = pts.length; j < maxj; j += 1) {
      let x = map(pts[j].x, limits[0], limits[1], 0, vdif.x) + offset.x;
      let y = map(pts[j].y, limits[2], limits[3], 0, vdif.y) + offset.y;
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

  let mapVector = (x: number, y: number) =>
    new Vector2D(
      map(x, limits[0], limits[1], 0, vdif.x) + offset.x,
      map(y, limits[2], limits[3], 0, vdif.y) + offset.y
    );

  for (let i = 0, maxi = ~~(swaps.length / elems) * elems; i < maxi; i += elems) {
    let x1 = swaps[i];
    let y1 = swaps[i + 1];
    let x2 = swaps[i + 2];
    let y2 = swaps[i + 3];
    let type = swaps[i + 4];

    if (
      x1 < 0 ||
      x1 >= order ||
      y1 < 0 ||
      y1 >= order ||
      x2 < 0 ||
      x2 >= order ||
      x2 < 0 ||
      x2 >= order
    ) {
      continue;
    }

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";

    let c1 = stickers[x1 + y1 * order].getMassCenter();
    let c2 = stickers[x2 + y2 * order].getMassCenter();

    let ini = mapVector(c1.x, -c1.y);
    let fin = mapVector(c2.x, -c2.y);
    let tip = fin.sub(ini).unit().mul(tipLength);
    let tip1 = fin.add(tip.rot(tipAngle));
    let tip2 = fin.add(tip.rot(-tipAngle));
    let tip3 = ini.sub(tip.rot(tipAngle));
    let tip4 = ini.sub(tip.rot(-tipAngle));
    let m1 = tip1.add(tip2).div(2);
    let m2 = tip3.add(tip4).div(2);

    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.lineTo(fin.x, fin.y);
    ctx.lineTo(tip1.x, tip1.y);
    ctx.lineTo(tip2.x, tip2.y);
    ctx.fill();
    ctx.stroke();

    if (type != 0) {
      ctx.beginPath();
      ctx.lineTo(ini.x, ini.y);
      ctx.lineTo(tip3.x, tip3.y);
      ctx.lineTo(tip4.x, tip4.y);
      ctx.fill();
      ctx.stroke();
    }

    ctx.lineWidth = 4;
    ctx.lineCap = "square";

    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.lineTo(type ? m2.x : ini.x, type ? m2.y : ini.y);
    ctx.stroke();
  }
}
