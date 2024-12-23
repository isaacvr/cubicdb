import { CENTER, Vector3D } from "./../vector3d";
import { Sticker } from "./Sticker";
import type { PuzzleInterface, RoundCornersParams } from "@interfaces";
import { FaceSticker } from "./FaceSticker";
import { bezier, circle, lineIntersection3D, mod } from "@helpers/math";
import { ImageSticker } from "./ImageSticker";
import { EPS } from "@constants";
import { TextSticker } from "./TextSticker";
import { BezierSticker } from "./BezierSticker";
import { BezierCurve } from "./BezierCurve";

export function assignColors(p: PuzzleInterface, cols?: string[], isCube = false) {
  const colors = cols || ["y", "o", "g", "w", "r", "b"];

  const stickers: Sticker[] = p.getAllStickers();
  const pieces = p.pieces;

  // Adjust -1, 0 and 1 values for better precision
  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    const sticker = stickers[i];
    const points = sticker.points;
    for (let j = 0, maxj = points.length; j < maxj; j += 1) {
      for (let k = -1; k <= 1; k += 1) {
        if (Math.abs(points[j].x - k) < EPS) {
          points[j].x = k;
        }
        if (Math.abs(points[j].y - k) < EPS) {
          points[j].y = k;
        }
        if (Math.abs(points[j].z - k) < EPS) {
          points[j].z = k;
        }
      }
    }
  }

  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    if (
      stickers[i].nonInteractive ||
      stickers[i] instanceof ImageSticker ||
      stickers[i] instanceof TextSticker
    )
      continue;

    const sticker = stickers[i];
    const p1 = sticker.getMassCenter();
    const u = sticker.getOrientation();
    const dirs = [0, 0, 0];
    let ok = false;

    if (isCube) {
      if (!sticker.points.every(p => [p.x, p.y, p.z].some(n => Math.abs(Math.abs(n) - 1) < EPS))) {
        sticker.color = "x";
        sticker.oColor = "x";
        ok = true;
      } else {
        dirs[0] = 1;
      }
    } else {
      for (let j = 0, maxj = pieces.length; j < maxj; j += 1) {
        dirs[pieces[j].direction1(p1, u, true) + 1] += 1;

        if (dirs[0] > 0 && dirs[2] > 0) {
          sticker.color = "x";
          sticker.oColor = "x";
          ok = true;
          break;
        }
      }
    }

    if (!ok) {
      if (dirs[0] > 0) {
        for (let j = 0, maxj = colors.length; j < maxj; j += 1) {
          if (u.sub(p.faceVectors[j]).abs() < EPS) {
            sticker.color = colors[j];
            sticker.oColor = colors[j];
            break;
          }
        }
      } else {
        sticker.color = "x";
        sticker.oColor = "x";
      }
    }
  }
}

export function getAllStickers(): Sticker[] | BezierSticker[] {
  const res = [];
  // @ts-ignore
  const pieces = this.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    const stickers = pieces[i].stickers;
    res.push(...stickers);
  }

  return res;
}

export function scaleSticker(st: Sticker | BezierSticker, scale: number, self = false) {
  const SCALE = scale || 0.925;

  if (SCALE < 0) {
    return st;
  }

  const n = st.getOrientation();
  const cm = st.updateMassCenter();
  return st.sub(cm, self).mul(SCALE, true).add(cm, true).add(n.mul(0.005), true);
}

export function roundStickerCorners(
  s: Sticker,
  rd?: number | Function,
  scale?: number,
  ppc?: number,
  calcPath?: boolean
) {
  const RAD = rd || 0.11;
  const RAD_FN = typeof rd === "function" ? rd : () => RAD;
  const PPC = ppc || 10;
  const SCALE = scale || 0.925;
  const ROUND_THRESHOLD = 0.1;

  const st = s;
  const pts = st.points;
  const newSt = calcPath ? new BezierSticker() : new Sticker();

  if (ppc === 0) {
    return scaleSticker(s.clone(), SCALE);
  }

  for (let i = 0, maxi = pts.length; i < maxi; i += 1) {
    const r = RAD_FN(s, i);

    if (r === null) return s;

    let isCircle = Array.isArray(r) && r.length === 1;
    const isEllipse = Array.isArray(r) && r.length > 1;
    const seg_perc = isCircle || isEllipse ? r[0] : r;
    const seg_perc1 = isEllipse ? (typeof r[1] != "boolean" ? r[1] : r[0]) : isCircle ? r[0] : r;
    let v1 = pts[mod(i - 1, maxi)].sub(pts[i]).mul(seg_perc);
    let v2 = pts[mod(i + 1, maxi)].sub(pts[i]).mul(seg_perc1);
    const abs1 = v1.abs() / seg_perc;
    const abs2 = v2.abs() / seg_perc1;

    // Short on both sides => go as a point
    if (abs1 < ROUND_THRESHOLD && abs2 < ROUND_THRESHOLD) {
      newSt.points.push(pts[i].clone());
      calcPath && (newSt as BezierSticker).parts.push(pts[i].clone());
      continue;
    }

    // Short on the first side => Bezier
    if (abs1 < ROUND_THRESHOLD) {
      bezier([pts[mod(i - 1, maxi)], pts[i], pts[i].add(v2)], PPC).forEach(p =>
        newSt.points.push(p)
      );

      calcPath &&
        (newSt as BezierSticker).parts.push(
          new BezierCurve([pts[mod(i - 1, maxi)], pts[i], pts[i].add(v2)], PPC)
        );
      continue;
    }

    // Short on the second side => bezier
    if (abs2 < ROUND_THRESHOLD) {
      const abs21 = pts[mod(i + 1, maxi)].sub(pts[mod(i + 2, maxi)]).abs();
      const v22 = pts[mod(i + 2, maxi)].sub(pts[mod(i + 1, maxi)]).mul(seg_perc1);

      // Check another point next to them
      if (abs21 < ROUND_THRESHOLD) {
        bezier([pts[i].add(v1), pts[i], pts[mod(i + 1, maxi)]], PPC).forEach(p =>
          newSt.points.push(p)
        );

        calcPath &&
          (newSt as BezierSticker).parts.push(
            new BezierCurve([pts[i].add(v1), pts[i], pts[mod(i + 1, maxi)]], PPC)
          );
      } else {
        bezier(
          [pts[i].add(v1), pts[i], pts[mod(i + 1, maxi)], pts[mod(i + 1, maxi)].add(v22)],
          PPC
        ).forEach(p => newSt.points.push(p));

        calcPath &&
          (newSt as BezierSticker).parts.push(
            new BezierCurve(
              [pts[i].add(v1), pts[i], pts[mod(i + 1, maxi)], pts[mod(i + 1, maxi)].add(v22)],
              PPC
            )
          );
      }

      i += 1;
      continue;
    }

    if (isEllipse && typeof r[1] === "boolean") {
      if (v1.abs() < v2.abs()) {
        v2 = v2.setLength(v1.abs());
      } else {
        v1 = v1.setLength(v2.abs());
      }

      isCircle = true;
    }

    if (isCircle) {
      circle(pts[i].add(v1), pts[i], pts[i].add(v2), PPC).forEach(p => {
        newSt.points.push(p);
        calcPath && (newSt as BezierSticker).parts.push(p.clone());
      });
    } else {
      bezier([pts[i].add(v1), pts[i], pts[i].add(v2)], PPC).forEach(p => newSt.points.push(p));

      calcPath &&
        (newSt as BezierSticker).parts.push(
          new BezierCurve([pts[i].add(v1), pts[i], pts[i].add(v2)], PPC)
        );
    }
  }

  return scaleSticker(newSt, SCALE);
}

export function roundCorners({ p, rd, scale, ppc, fn, justScale, calcPath }: RoundCornersParams) {
  if (p.isRounded) {
    return;
  }

  const BANNED_CLASSES = [FaceSticker, ImageSticker, TextSticker];
  const CHECK = fn || ((s: Sticker) => !BANNED_CLASSES.some(cl => s instanceof cl));

  p.isRounded = true;
  const pieces = p.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    const pc = pieces[i];
    const s = pc.stickers;

    for (let j = 0, maxj = s.length; j < maxj; j += 1) {
      if (!CHECK(s[j])) {
        continue;
      }

      const newSt = justScale
        ? scaleSticker(s[j], 0)
        : roundStickerCorners(s[j], rd, scale, ppc, calcPath);

      if (newSt === s[j]) continue;

      newSt.updateMassCenter();

      newSt.color = s[j].color;
      newSt.oColor = s[j].oColor;
      newSt.vecs = s[j].vecs.map(e => e.clone());

      s[j].color = "d";
      s[j].oColor = "d";
      newSt._generator = s[j];
      s[j]._generated = newSt;

      if (s[j].nonInteractive) {
        s.splice(j, 1, newSt);
      } else {
        s.push(newSt);
      }
    }
  }
}

export function assignVectors(p: PuzzleInterface) {
  const pieces = p.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    const stickers = pieces[i].stickers;
    const vecs = pieces[i].stickers.reduce((ac: Vector3D[], s) => {
      if (s.color != "x" && s.color != "d") {
        ac.push(s.getOrientation());
      }
      return ac;
    }, []);

    for (let j = 0, maxj = stickers.length; j < maxj; j += 1) {
      if (stickers[j].color != "x" && stickers[j].color != "d") {
        stickers[j].vecs = vecs.map(e => e.clone());
      }
    }
  }
}

export function random(a: any) {
  if (Array.isArray(a) || typeof a === "string") {
    return a[~~(Math.random() * a.length)];
  } else if (typeof a === "object") {
    const k = Object.keys(a);
    return a[k[~~(Math.random() * k.length)]];
  }

  return ~~(Math.random() * a);
}

export function extrudeSticker(
  s: Sticker,
  u: Vector3D,
  closeIni = false,
  closeFin = false,
  closePath = true
): FaceSticker {
  const s1 = s.add(u);
  const faces: number[][] = [];

  for (let i = 0, maxi = s.points.length; i < maxi; i += 1) {
    if (!closePath && i + 1 === maxi) break;
    const ni = mod(i + 1, maxi);
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
