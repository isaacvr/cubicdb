import { randomUUID } from '@helpers/strings';
import { CENTER, Vector3D } from '../vector3d';
import type { Sticker } from './Sticker';
import { rotateBundle } from '@helpers/math';

export class Piece {
  stickers: Sticker[];
  boundingBox: Vector3D[];
  hasCallback: boolean;
  callback: Function;
  anchor: Vector3D;
  _cached_mass_center: Vector3D;
  raw: any;
  allPointsRef: number[][];
  _id: string;

  constructor(stickers?: Sticker[]) {
    this._id = randomUUID();
    this.stickers = (stickers || []).map(e => e.clone());
    this.hasCallback = false;
    this.callback = () => { };
    this.allPointsRef = [];
    this.boundingBox = [];
    this.anchor = CENTER.clone();
    this._cached_mass_center = CENTER.clone();
    this.updateMassCenter();
    this.computeBoundingBox();
  }

  get id() {
    return this._id;
  }

  updateMassCenter(recursive?: boolean): Vector3D {
    let pts = this.getAllGeneratorPoints();
    let sum = pts.reduce((s, e) => s.add(e), new Vector3D());
    this._cached_mass_center = sum.div(pts.length || 1);

    if (recursive) {
      this.stickers.forEach(s => s.updateMassCenter());
    }

    return this._cached_mass_center;
  }

  get length(): number {
    return this.stickers.length;
  }

  get totalPoints(): number {
    let res = 0;
    let stickers = this.stickers;
    for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
      res += stickers[i].points.length;
    }
    return res;
  }

  getAllGeneratorPoints(): Vector3D[] {
    let res = [];
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      res.push(...this.stickers[i]._generator.points);
    }
    return res;
  }

  getAllPoints(): Vector3D[] {
    let res = [];
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      res.push(...this.stickers[i].points);
    }
    return res;
  }

  getMassCenter(cached: boolean = true): Vector3D {
    if (!cached) {
      this.updateMassCenter();
    }
    return this._cached_mass_center;
  }

  setColor(cols: string[]) {
    for (let i = 0, maxi = Math.min(cols.length, this.stickers.length); i < maxi; i += 1) {
      this.stickers[i].color = cols[i];
    }
  }

  add(ref: Vector3D, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.add(ref, true));
      this.boundingBox.forEach(s => s.add(ref, true));
      this._cached_mass_center.add(ref, true);
      this.anchor && this.anchor.add(ref, true);
      return this;
    }
    return this.clone().add(ref, true);
    // return new Piece(this.stickers.map(s => s.add(ref)));
  }

  sub(ref: Vector3D, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.sub(ref, true));
      this.boundingBox.forEach(s => s.sub(ref, true));
      this._cached_mass_center.sub(ref, true);
      this.anchor && this.anchor.sub(ref, true);
      return this;
    }
    return this.clone().sub(ref, true);
    // return new Piece(this.stickers.map(s => s.sub(ref)));
  }

  mul(f: number, self?: boolean): Piece {
    if (self) {
      this.stickers.forEach(s => s.mul(f, true));
      this.boundingBox.forEach(s => s.mul(f, true));
      this._cached_mass_center.mul(f, true);
      this.anchor && this.anchor.mul(f, true);
      return this;
    }
    return this.clone().mul(f, true);
    // return new Piece(this.stickers.map(s => s.mul(f)));
  }

  div(f: number): Piece {
    if (self) {
      this.stickers.forEach(s => s.div(f, true));
      this.boundingBox.forEach(s => s.div(f, true));
      this._cached_mass_center.div(f, true);
      this.anchor && this.anchor.div(f, true);
      return this;
    }
    return this.clone().div(f);
    // return new Piece( this.stickers.map(s => s.div(f) ));
  }

  // rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean): Piece {
  //   if (self) {
  //     this.stickers.map(s => s.rotate(ref, dir, ang, true));
  //     this._cached_mass_center.rotate(ref, dir, ang, true);
  //     // this.computeBoundingBox();
  //     this.anchor && this.anchor.rotate(ref, dir, ang, true).toNormal();
  //     return this;
  //   }
  //   let p = new Piece();
  //   p.stickers = this.stickers.map(s => s.rotate(ref, dir, ang));
  //   p._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
  //   this.anchor && (p.anchor = this.anchor.rotate(ref, dir, ang).toNormal());
  //   // p.computeBoundingBox();
  //   return p;
  // }

  rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean): Piece {
    if (self) {
      let pts: Vector3D[] = [];

      for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
        let p = this.stickers[i].points;

        for (let j = 0, maxj = p.length; j < maxj; j += 1) {
          pts.push(p[j]);
        }
      }

      let pts1 = rotateBundle(pts, ref, dir, ang);
      pts.forEach((e, p) => e.setCoords(pts1[p].x, pts1[p].y, pts1[p].z));
      this.stickers.map(s => s.partialRotation(ref, dir, ang, true));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.anchor && this.anchor.rotate(ref, dir, ang, true).toNormal();
      return this;
    }

    let pc = new Piece();
    pc.stickers = this.stickers.map(s => s.rotateBundle(ref, dir, ang));
    pc._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    this.anchor && (pc.anchor = this.anchor.rotate(ref, dir, ang).toNormal());
    return pc;
  }

  // async rotateGPU(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean): Promise<Piece> {
  //   if (!navigator.gpu) {
  //     console.log('GPU not supported');
  //     return this;
  //   }

  //   const adapter = navigator.gpu.requestAdapter();

  //   if (!adapter) {
  //     console.log("Could not find any GPU adapter");
  //   }

  //   const device = await adapter.requestDevice();

  //   const BUFFER_SIZE = 1000;

  //   const shader = /* wgsl */`
  //   @group(0) @binding(0)
  //   var<storage, read_write> output: array<f32>;

  //   @compute @workgroup_size(64)
  //   fn main(
  //     @builtin(global_invocation_id)
  //     global_id: vec3u,

  //     @builtin(global_invocation_id)
  //     local_id: vec3u,
  //   ) {
  //     if ( global_id.x >= ${BUFFER_SIZE} ) {
  //       return;
  //     }

  //     output[global_id.x] = f32(global_id.x) * 1000. + f32(local_id.x);
  //   }
  //   `;

  //   const output = device.createBuffer({
  //     size: BUFFER_SIZE,
  //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  //   });

  //   const stagingBuffer = device.createBuffer({
  //     size: BUFFER_SIZE,
  //     usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  //   });

  //   return this;
  //   // if ( self ) {
  //   //   this.stickers.map(s => s.rotate(ref, dir, ang, true));
  //   //   this._cached_mass_center.rotate(ref, dir, ang, true);
  //   //   // this.computeBoundingBox();
  //   //   this.anchor && this.anchor.rotate(ref, dir, ang, true).toNormal();
  //   //   return this;
  //   // }
  //   // let p = new Piece();
  //   // p.stickers = this.stickers.map(s => s.rotate(ref, dir, ang));
  //   // p._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
  //   // this.anchor && (p.anchor = this.anchor.rotate(ref, dir, ang).toNormal());
  //   // // p.computeBoundingBox();
  //   // return p;
  // }

  direction(p1: Vector3D, p2: Vector3D, p3: Vector3D, useMassCenter?: boolean, disc?: Function): -1 | 0 | 1 {
    return this.direction1(p1, Vector3D.cross(p1, p2, p3), useMassCenter, disc);
  }

  direction1(anchor: Vector3D, u: Vector3D, useMassCenter?: boolean, disc?: Function): -1 | 0 | 1 {
    let dirs = [0, 0, 0];
    let st = this.stickers;
    let len = 0;
    let fn = disc || (() => true);

    for (let i = 0, maxi = st.length; i < maxi; i += 1) {
      if (st[i].nonInteractive) continue;

      if (fn(st[i])) {
        len += 1;
        let d = st[i].direction1(anchor, u, useMassCenter);
        dirs[d + 1] += 1;

        if (!useMassCenter && d === 0) {
          // console.log('[direction1] 1: ', dirs, d, i, maxi);
          return 0;
        }

        if (dirs[0] > 0 && dirs[2] > 0) {
          // console.log('[direction1] 2: ', dirs, i, maxi);
          return 0;
        }
      }
    }

    // dirs[1] === len && console.log('[direction1] 3: ', dirs, len);

    return dirs[1] === len ? 0 : dirs[0] ? -1 : 1;
  }

  reflect(p1: Vector3D, p2: Vector3D, p3: Vector3D, preserveOrientation?: boolean): Piece {
    let res = this.clone();
    res.stickers = res.stickers.map(s => s.reflect(p1, p2, p3));
    res.anchor && (res.anchor = res.anchor.reflect(p1, p2, p3));
    // res.computeBoundingBox();
    if (preserveOrientation) {
      res.stickers.forEach(s => s.reverse(true));
    }
    return res;
  }

  reflect1(a: Vector3D, u: Vector3D, preserveOrientation?: boolean): Piece {
    let res = this.clone();
    res.stickers = res.stickers.map(s => s.reflect1(a, u));
    res.anchor && (res.anchor = res.anchor.reflect1(a, u));
    // res.computeBoundingBox();
    if (preserveOrientation) {
      res.stickers.forEach(s => s.reverse(true));
    }
    return res;
    // return new Piece(
    //   this.stickers.map(s => s.reflect1(a, u, preserveOrientation))
    // );
  }

  reverse(): Piece {
    return new Piece(
      this.stickers.map(s => s.reverse())
    );
  }

  contains(col: string): boolean {
    for (let i = 0, maxi = this.stickers.length; i < maxi; i += 1) {
      if (this.stickers[i].color === col || this.stickers[i].oColor === col) {
        return true;
      }
    }

    return false;
  }

  clone(withCallback?: boolean) {
    let res = new Piece(this.stickers);
    if (withCallback && this.hasCallback) {
      res.hasCallback = this.hasCallback;
      res.callback = this.callback;
    }
    this.anchor && (res.anchor = this.anchor.clone());
    res.allPointsRef = this.allPointsRef.map(e => e.slice());
    return res;
  }

  equal(p1: Piece): boolean {
    let s1 = this.stickers;
    let s2 = p1.stickers;

    if (s1.length != s2.length) {
      return false;
    }

    for (let i = 0, maxi = s1.length; i < maxi; i += 1) {
      if (!s1[i].equal(s2[i])) {
        return false;
      }
    }

    return true;
  }

  exact(p1: Piece): boolean {
    return this.id === p1.id;
  }

  computeBoundingBox(): Vector3D[] {
    let bbs = this.stickers.map(s => s.computeBoundingBox());
    let box = bbs.reduce((ac, p) => {
      return [
        Math.min(ac[0], p[0].x), Math.min(ac[1], p[0].y), Math.min(ac[2], p[0].z),
        Math.max(ac[3], p[1].x), Math.max(ac[4], p[1].y), Math.max(ac[5], p[1].z),
      ]
    }, [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);

    this.boundingBox = [
      new Vector3D(box[0], box[1], box[2]),
      new Vector3D(box[3], box[4], box[5])
    ];

    return this.boundingBox;
  }
}