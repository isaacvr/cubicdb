import { CENTER, LEFT, Vector3D } from "@classes/vector3d";
import { FaceSticker } from "./FaceSticker";

function getFaceSticker(pts: number[]): FaceSticker {
  const p: Vector3D[] = [];
  const f: number[][] = [];

  for (let i = 0, maxi = pts.length; i < maxi; i += 2) {
    p.push(new Vector3D(pts[i], pts[i + 1]));
  }

  for (let i = 1, maxi = p.length - 1; i < maxi; i += 1) {
    f.push([0, i, i + 1]);
  }

  return new FaceSticker(p, f);
}

function process(f: FaceSticker) {
  return f
    .mul(2 / 3 / 500, true)
    .add(OFFSET, true)
    .mul(0.9, true)
    .rotate(CENTER, LEFT, PI, true)
    .add(OFFSET1, true)
    .rotate(CENTER, LEFT, PI_2, true)
    .reverse();
}

const PI = Math.PI;
const PI_2 = Math.PI / 2;
const OFFSET = new Vector3D(-1 / 3, -1 / 3, 0);
const OFFSET1 = new Vector3D(0, 0, 1.01);

// G
const gpts1 = [383, 155, 248, 77, 248, 119, 348, 176];
const gpts2 = [248, 77, 113, 155, 185, 155, 248, 119];
const gpts3 = [113, 155, 248, 233, 248, 191, 185, 155];
const gpts4 = [248, 233, 328, 186, 265, 181, 248, 191];
const gpts5 = [328, 186, 248, 140, 222, 155, 265, 181];

const G = [gpts1, gpts2, gpts3, gpts4, gpts5].map(p => process(getFaceSticker(p)));

// <path d="M 383 155 L 248 77 L 248 119 L 348 176 Z" />
// <path d="M 248 77 L 113 155 L 185 155 L 248 119 Z"/>
// <path d="M 113 155 L 248 233 L 248 191 L 185 155Z"/>
// <path d="M 248 233 L 328 186 L 265 181 L 248 191Z"/>
// <path d="M 328 186 L 248 140 L 222 155 L 265 181Z"/>

// A
const apts1 = [103, 172, 103, 327, 139, 348, 139, 233];
const apts2 = [139, 306, 203, 342, 203, 301, 139, 265];
const apts3 = [203, 384, 239, 405, 239, 249, 203, 270];
const apts4 = [103, 172, 139, 233, 203, 270, 239, 249];

const A = [apts1, apts2, apts3, apts4].map(p => process(getFaceSticker(p)));

// <path d="M 103 172 L 103 327 L 139 348 L 139 233 Z"/>
// <path d="M 139 306 L 203 342 L 203 301 L 139 265 Z"/>
// <path d="M 203 384 L 239 405 L 239 249 L 203 270 Z"/>
// <path d="M 103 172 L 139 233 L 203 270 L 239 249 Z"/>

// N
const npts1 = [258, 250, 258, 405, 294, 384, 294, 291, 285, 234];
const npts2 = [294, 291, 373, 337, 357, 275, 285, 234];
const npts3 = [373, 337, 393, 326, 393, 171, 357, 192, 357, 275];

const N = [npts1, npts2, npts3].map(p => process(getFaceSticker(p)));

// <path d="M 258 250 L 258 405 L 294 384 L 294 291 L 285 234 Z"/>
// <path d="M 294 291 L 373 337 L 357 275 L 285 234 Z"/>
// <path d="M 373 337 L 393 326 L 393 171 L 357 192 L 357 275 Z"/>

export { G, A, N };
