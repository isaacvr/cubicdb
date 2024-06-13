import { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { CENTER, DOWN, FRONT, Vector3D } from "@classes/vector3d";
import { SVGGenerator } from "./classes/SVGGenerator";
import { CanvasGenerator } from "./classes/CanvasGenerator";
import type { IDrawer } from "./utils";

function circle(ctx: IDrawer, x: number, y: number, rad: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

function drawSingleClock(
  ctx: IDrawer,
  RAD: number,
  X: number,
  Y: number,
  MAT: any,
  PINS: any,
  BLACK: string,
  WHITE: string,
  GRAY: string
) {
  const W = RAD * 0.582491582491582;
  const RAD_CLOCK = RAD * 0.2020202020202;
  const BORDER = RAD * 0.0909090909090909;
  const BORDER1 = 4;

  const PI = Math.PI;
  const TAU = PI * 2;

  const arrow = new Sticker([
    new Vector3D(0.0, 1.0),
    new Vector3D(0.1491, 0.4056),
    new Vector3D(0.0599, 0.2551),
    new Vector3D(0.0, 0.0),
    new Vector3D(-0.0599, 0.2551),
    new Vector3D(-0.1491, 0.4056),
  ]).mul(RAD_CLOCK);

  const circles = new Sticker([new Vector3D(0.1672), new Vector3D(0.1254)]).mul(RAD_CLOCK);

  const R_PIN = circles.points[0].x * 2.3;

  circle(ctx, X, Y, RAD, WHITE);

  for (let i = -1; i < 2; i += 2) {
    for (let j = -1; j < 2; j += 2) {
      circle(ctx, X + W * i, Y + W * j, RAD_CLOCK + BORDER + BORDER1, WHITE);
      circle(ctx, X + W * i, Y + W * j, RAD_CLOCK + BORDER, BLACK);
    }
  }

  circle(ctx, X, Y, RAD - BORDER1, BLACK);

  for (let i = -1; i < 2; i += 1) {
    for (let j = -1; j < 2; j += 1) {
      circle(ctx, X + W * i, Y + W * j, RAD_CLOCK, WHITE);

      const ANCHOR = new Vector3D(X + W * i, Y + W * j);
      let angId = MAT[j + 1][i + 1];
      let ang = (angId * TAU) / 12;
      let pts = arrow.rotate(CENTER, FRONT, PI + ang).add(ANCHOR).points;
      ctx.fillStyle = BLACK;
      ctx.beginPath();
      for (let p = 0, maxp = pts.length; p < maxp; p += 1) {
        p === 0 && ctx.moveTo(pts[p].x, pts[p].y);
        p > 0 && ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.fill();
      ctx.closePath();

      circle(ctx, ANCHOR.x, ANCHOR.y, circles.points[0].x, BLACK);
      circle(ctx, ANCHOR.x, ANCHOR.y, circles.points[1].x, WHITE);

      for (let a = 0; a < 12; a += 1) {
        let pt = ANCHOR.add(DOWN.mul(RAD_CLOCK + BORDER / 2).rotate(CENTER, FRONT, (a * TAU) / 12));
        let r = (circles.points[0].x / 4) * (a ? 1 : 1.6);
        let c = a ? WHITE : "#ff0000";
        circle(ctx, pt.x, pt.y, r, c);
      }

      if (i <= 0 && j <= 0) {
        let val = PINS[(j + 1) * 2 + i + 1];
        circle(ctx, ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN, val ? WHITE : GRAY);
        circle(ctx, ANCHOR.x + W / 2, ANCHOR.y + W / 2, R_PIN * 0.8, val ? BLACK : GRAY);
      }
    }
  }
}

export function clockImage(cube: Puzzle, DIM: number, format: "raster" | "svg" = "svg"): string {
  const W = DIM * 2.2;
  const H = DIM;
  const ctx = format === 'svg' ? new SVGGenerator(W, H) : new CanvasGenerator(W, H);

  const PINS1 = cube.p.raw[0];
  const PINS2 = cube.p.raw[0].map((e: any, p: number) => !PINS1[((p >> 1) << 1) + 1 - (p & 1)]);
  const MAT = cube.p.raw[1];
  const RAD = DIM / 2;

  const BLACK = cube.p.palette.black;
  const WHITE = cube.p.palette.white;
  const GRAY = cube.p.palette.gray;

  drawSingleClock(ctx, RAD, RAD, RAD, MAT[0], PINS2, BLACK, WHITE, GRAY);
  drawSingleClock(ctx, RAD, W - RAD, RAD, MAT[1], PINS1, WHITE, BLACK, GRAY);

  return ctx.getImage();
}
