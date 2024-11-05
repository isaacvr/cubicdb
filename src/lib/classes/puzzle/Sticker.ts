import { EPS } from "@constants";
import { Vector3D, CENTER } from "$lib/classes/vector3d";
import { rotateBundle } from "@helpers/math";

interface StickerPointCMD {
  type: "point";
  point: Vector3D;
}

interface StickerBezierCMD {
  type: "bezier";
  order: number;
  points: Vector3D[];
}

type StickerCMD = StickerPointCMD | StickerBezierCMD;

export class Sticker {
  points: Vector3D[];
  color: string;
  oColor: string;
  _generator: Sticker;
  _generated: Sticker;
  vecs: Vector3D[];
  boundingBox: Vector3D[];
  _cached_mass_center: Vector3D;
  nonInteractive: boolean;
  name: string;
  userData: any;
  // commands: StickerCMD[];

  constructor(
    pts?: Vector3D[],
    color?: string,
    vecs?: Vector3D[],
    nonInteractive = false,
    name = ""
  ) {
    this.points = (pts || []).map(e => e.clone());
    this.oColor = color || "w";
    this.color = this.oColor;
    this.boundingBox = [];
    this._cached_mass_center = CENTER;
    this.updateMassCenter();
    this._generator = this;
    this._generated = this;
    this.vecs = (vecs || []).map(v => v.unit());
    this.nonInteractive = nonInteractive;
    this.name = name;
    // this.commands = this.points.map(p => ({ type: "point", point: p }));
  }

  computeBoundingBox(): Vector3D[] {
    let box = this.points.reduce(
      (ac, p) => {
        return [
          Math.min(ac[0], p.x),
          Math.min(ac[1], p.y),
          Math.min(ac[2], p.z),
          Math.max(ac[3], p.x),
          Math.max(ac[4], p.y),
          Math.max(ac[5], p.z),
        ];
      },
      [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    );

    return (this.boundingBox = [
      new Vector3D(box[0], box[1], box[2]),
      new Vector3D(box[3], box[4], box[5]),
    ]);
  }

  updateMassCenter(): Vector3D {
    let pts = this.points;
    this._cached_mass_center = pts
      .reduce((s, e) => s.add(e, true), new Vector3D())
      .div(pts.length || 1);
    return this._cached_mass_center;
  }

  getMassCenter(): Vector3D {
    return this._cached_mass_center.clone();
  }

  add(ref: Vector3D, self?: boolean): Sticker {
    if (self) {
      this.points.forEach(p => p.add(ref, true));
      // this.boundingBox.forEach(p => p.add(ref, true));
      this._cached_mass_center.add(ref, true);
      return this;
    }
    let cp = this.clone(true);
    // cp.boundingBox = this.boundingBox.map(e => e.add(ref));
    cp.points = this.points.map(e => e.add(ref));
    cp._cached_mass_center = cp._cached_mass_center.add(ref);
    return cp;
  }

  sub(ref: Vector3D, self?: boolean): Sticker {
    if (self) {
      this.points.forEach(p => p.sub(ref, true));
      // this.boundingBox.forEach(p => p.sub(ref, true));
      this._cached_mass_center.sub(ref, true);
      return this;
    }
    let cp = this.clone(true);
    // cp.boundingBox = this.boundingBox.map(e => e.sub(ref));
    cp.points = this.points.map(e => e.sub(ref));
    cp._cached_mass_center = cp._cached_mass_center.sub(ref);
    return cp;
  }

  mul(f: number, self?: boolean): Sticker {
    if (self) {
      this.points.forEach(p => p.mul(f, true));
      // this.boundingBox.forEach(p => p.mul(f, true));
      this._cached_mass_center.mul(f, true);
      return this;
    }
    let cp = this.clone(true);
    // cp.boundingBox = this.boundingBox.map(e => e.mul(f));
    cp.points = this.points.map(e => e.mul(f));
    cp._cached_mass_center = cp._cached_mass_center.mul(f);
    return cp;
  }

  div(f: number, self?: boolean): Sticker {
    if (self) {
      this.points.forEach(p => p.div(f, true));
      // this.boundingBox.forEach(p => p.div(f, true));
      this._cached_mass_center.div(f, true);
      return this;
    }
    let cp = this.clone(true);
    // cp.boundingBox = this.boundingBox.map(e => e.div(f));
    cp.points = this.points.map(e => e.div(f));
    cp._cached_mass_center = cp._cached_mass_center.div(f);
    return cp;
  }

  dot(v: Vector3D): number[] {
    return this.points.map(e => e.dot(v));
  }

  getOrientation(): Vector3D {
    let n = this.points.length;
    let i = [0, 1, 2].map(e => Math.round((e / 3) * n));
    return Vector3D.cross(this.points[i[0]], this.points[i[1]], this.points[i[2]]).unit();
  }

  normal(): Vector3D {
    return this.getOrientation();
  }

  rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean, col?: string): Sticker {
    if (Math.abs(ang % (Math.PI * 2)) < EPS) {
      return self ? this : this.clone();
    }

    if (self) {
      this.points.forEach(e => e.rotate(ref, dir, ang, true));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      this.color = col || this.color;
      return this;
    }

    let res = this.clone(true);
    res.points = this.points.map(e => e.rotate(ref, dir, ang));
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    return res;
  }

  partialRotation(
    ref: Vector3D,
    dir: Vector3D,
    ang: number,
    self?: boolean,
    col?: string
  ): Sticker {
    if (Math.abs(ang % (Math.PI * 2)) < EPS) {
      return self ? this : this.clone();
    }

    if (self) {
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      this.color = col || this.color;
      return this;
    }

    let res = this.clone(true);
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    return res;
  }

  rotateBundle(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean, col?: string): Sticker {
    if (Math.abs(ang % (Math.PI * 2)) < EPS) {
      return self ? this : this.clone();
    }

    const points = rotateBundle(this.points, ref, dir, ang) as Vector3D[];

    if (self) {
      this.points.forEach((e, p) => e.setCoords(points[p].x, points[p].y, points[p].z));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      this.color = col || this.color;
      return this;
    }

    let res = this.clone(true);
    res.points = points;
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    return res;
  }

  clone(excludePoints?: boolean): Sticker {
    let s = new Sticker(
      excludePoints ? [] : this.points,
      this.color,
      this.vecs,
      this.nonInteractive,
      this.name
    );
    s.color = this.color;
    s.oColor = this.oColor;
    s._cached_mass_center = this._cached_mass_center.clone();
    s.name = this.name;
    return s;
  }

  direction1(anchor: Vector3D, u: Vector3D, useMc?: boolean): -1 | 0 | 1 {
    let dirs = [0, 0, 0];
    let pts = useMc ? [this.getMassCenter()] : this.points;
    let len = pts.length;

    for (let i = 0; i < len; i += 1) {
      dirs[Vector3D.direction1(anchor, u, pts[i]) + 1] += 1;

      if (dirs[0] > 0 && dirs[2] > 0) {
        // console.log('   [direction1] 1: ', dirs);
        return 0;
      }
    }

    // dirs[1] === len && console.log('   [direction1] 2: ', dirs, len);
    return dirs[1] === len ? 0 : dirs[0] ? -1 : 1;
  }

  direction(p1: Vector3D, p2: Vector3D, p3: Vector3D, useMassCenter?: boolean): -1 | 0 | 1 {
    return this.direction1(p1, Vector3D.cross(p1, p2, p3), useMassCenter);
  }

  reflect(p1: Vector3D, p2: Vector3D, p3: Vector3D, preserveOrientation?: boolean): Sticker {
    return this.reflect1(p1, Vector3D.cross(p1, p2, p3), preserveOrientation);
  }

  reflect1(a: Vector3D, _u: Vector3D, preserveOrientation?: boolean): Sticker {
    let u = _u.unit();
    let s = this.clone(true);
    let dist = (p: Vector3D) => p.sub(a).dot(u);

    s.points = this.points.map(p => p.add(u.mul(-2 * dist(p))));
    if (preserveOrientation) {
      s.reverse(true);
    }
    s._cached_mass_center = s._cached_mass_center.add(u.mul(-2 * dist(s._cached_mass_center)));
    s.vecs = s.vecs.map(v => v.add(u.mul(-2 * v.dot(u))));
    return s;
  }

  reverse(self?: boolean): Sticker {
    if (self) {
      this.points.reverse();
      this.points.unshift(this.points[this.points.length - 1]);
      this.points.pop();
      return this;
    }
    let s = this.clone(true);
    s.points = this.points.map(p => p.clone()).reverse();
    s.points.unshift(s.points[s.points.length - 1]);
    s.points.pop();
    return s;
  }

  contains(p: Vector3D): boolean {
    let u = this.points[this.points.length - 1];
    let zProduct = 0;
    let product: Vector3D;

    for (const v of this.points) {
      product = u.sub(v).cross(u.sub(p));
      if ((zProduct < 0 && product.z > 0) || (zProduct > 0 && product.z < 0)) {
        return false;
      } else if (product.z !== 0) {
        zProduct = product.z;
      }
      u = v;
    }

    return true;
  }

  equal(s: Sticker): boolean {
    let p1 = this.points;
    let p2 = s.points;

    if (this.color != s.color || p1.length != p2.length) {
      return false;
    }

    for (let i = 0, maxi = p1.length; i < maxi; i += 1) {
      if (p1[i].sub(p2[i]).abs() > EPS) {
        return false;
      }
    }

    return true;
  }

  cutPlane(p0: Vector3D, n: Vector3D) {
    const inters: Vector3D[] = [];

    // Iterate through pairs of points to form segments
    let p = this.points;
    let interIndex: number[] = [];

    for (let i = 0, maxi = p.length; i < maxi; i += 1) {
      const p1 = p[i];
      const p2 = p[(i + 1) % maxi]; // Ensures we form a loop with the last and first point

      if (p1.sub(p0).dot(n) * p2.sub(p0).dot(n) > 0) continue;

      const lineVector = p2.sub(p1);
      const pointVector = p1.sub(p0);

      const num = n.mul(-1).dot(pointVector);
      const den = n.dot(lineVector);

      if (den !== 0) {
        const t = num / den;

        // t in range [0, 1] means the intersection is within the segment
        if (t >= 0 && t <= 1) {
          inters.push(p1.add(lineVector.mul(t)));
          interIndex.push(i);
        }
      }
    }

    for (let i = 0, maxi = inters.length; i < maxi && maxi > 1; i += 1) {
      if (inters[i].sub(inters[(i + 1) % maxi]).abs() < EPS) {
        inters.splice(i, 1);
        interIndex.splice(i, 1);
        i -= 1;
        maxi -= 1;
      }
    }

    let parts: Vector3D[][] = [[], []];

    if (inters.length > 1) {
      let pIndex = 0;
      for (let i = 0, maxi = p.length; i < maxi; i += 1) {
        parts[pIndex].push(p[i]);
        let pos = interIndex.indexOf(i);

        if (pos > -1) {
          parts[pIndex].push(inters[pos]);
          parts[pIndex].push(inters[1 - pos]);
          pIndex ^= 1;
        }
      }
    }

    return {
      intersection: inters.length > 1,
      points: inters,
      sticker: this,
      intersectionIndex: interIndex,
      parts: parts.map(part => new Sticker(part)),
    };
  }

  // scale(c: Vector3D, factor: number, self: boolean = false) {
  //   let res = self ? this : this.clone();
  //   res.sub(c, true).mul(factor, true).add(c, true);
  //   return res;
  // }

  // scaleX(c: Vector3D, factor: number, self: boolean = false) {
  //   let res = self ? this : this.clone();
  //   res.sub(c, true);

  //   res.points.forEach(p => { p.x *= factor; });
  //   res._cached_mass_center.x *= factor;
  //   res.add(c, true);

  //   return res;
  // }

  // scaleY(c: Vector3D, factor: number, self: boolean = false) {
  //   let res = self ? this : this.clone();
  //   res.sub(c, true);

  //   res.points.forEach(p => { p.y *= factor; });
  //   res._cached_mass_center.y *= factor;
  //   res.add(c, true);

  //   return res;
  // }
}
