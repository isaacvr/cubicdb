import { Vector3D, CENTER } from './../vector3d';

export class Sticker {
  points: Vector3D[];
  color: string;
  oColor: string;
  _generator: Sticker;
  _generated: Sticker;
  vecs: Vector3D[];
  boundingBox: Vector3D[];

  _cached_mass_center: Vector3D;

  constructor(pts?: Vector3D[], color?: string, vecs ?: Vector3D[]) {
    this.points = (pts || []).map(e => e.clone());
    this.oColor = color || 'w';
    this.color = this.oColor;
    this.updateMassCenter();
    // this.computeBoundingBox();
    this._generator = this;
    this._generated = this;
    this.vecs = (vecs || []).map(v => v.clone());
  }

  computeBoundingBox(): Vector3D[] {
    let box = this.points.reduce((ac, p) => {
      return [
        Math.min(ac[0], p.x), Math.min(ac[1], p.y), Math.min(ac[2], p.z),
        Math.max(ac[3], p.x), Math.max(ac[4], p.y), Math.max(ac[5], p.z),
      ]
    }, [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ]);

    return this.boundingBox = [
      new Vector3D(box[0], box[1], box[2]),
      new Vector3D(box[3], box[4], box[5])
    ];
  }

  updateMassCenter(): Vector3D {
    let pts = this.points;
    this._cached_mass_center = pts.reduce((s, e) => s.add(e), new Vector3D()).div(pts.length || 1);
    return this._cached_mass_center;
  }

  getMassCenter(): Vector3D {
    return this._cached_mass_center;
  }

  add(ref: Vector3D, self ?: boolean): Sticker {
    if ( self ) {
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

  sub(ref: Vector3D, self ?: boolean): Sticker {
    if ( self ) {
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

  mul(f: number, self ?: boolean): Sticker {
    if ( self ) {
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

  div(f: number, self ?: boolean): Sticker {
    if ( self ) {
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
    return Vector3D.cross( this.points[ i[0] ], this.points[ i[1] ], this.points[ i[2] ] ).unit();
  }

  normal(): Vector3D {
    return this.getOrientation();
  }

  rotate(ref: Vector3D, dir: Vector3D, ang: number, self?: boolean, col?: string): Sticker {
    if ( self ) {
      this.points.forEach(e => e.rotate(ref, dir, ang, true));
      this._cached_mass_center.rotate(ref, dir, ang, true);
      this.color = col || this.color;
      this.vecs.forEach(v => v.rotate(CENTER, dir, ang, true));
      // this.computeBoundingBox();
      return this;
    }
    
    let res = this.clone(true);
    res.points = this.points.map(e => e.rotate(ref, dir, ang));
    res._cached_mass_center = this._cached_mass_center.rotate(ref, dir, ang);
    res.color = col || res.color;
    res.vecs.map(v => v.rotate(CENTER, dir, ang, true));
    // res.computeBoundingBox();
    return res;
  }

  clone(excludePoints?: boolean): Sticker {
    let s = new Sticker(excludePoints ? [] : this.points, this.color);
    s.color = this.color;
    s.oColor = this.oColor;
    s._cached_mass_center = this._cached_mass_center.clone();
    s.vecs = this.vecs.map(e => e.clone());
    // s.boundingBox = this.boundingBox.map(e => e.clone());
    return s;
  }

  direction1(anchor: Vector3D, u: Vector3D, useMc?: boolean): -1 | 0 | 1 {
    let dirs = [0, 0, 0];
    let pts = (useMc) ? [this.getMassCenter()] : this.points;
    let len = pts.length;

    for (let i = 0; i < len; i += 1) {
      dirs[ Vector3D.direction1(anchor, u, pts[i]) + 1 ] += 1;
      
      if ( dirs[0] > 0 && dirs[2] > 0 ) {
        return 0;
      }
    }
    
    if ( dirs[1] === len ) {
      return 0;
    } else if ( dirs[0] > 0 ) {
      return -1;
    }

    return 1;
  }

  direction(p1: Vector3D, p2: Vector3D, p3: Vector3D, useMassCenter?: boolean): -1 | 0 | 1 {
    let dirs = [0, 0, 0];
    let pts = (useMassCenter) ? [this.getMassCenter()] : this.points;

    for (let i = 0, maxi = pts.length; i < maxi; i += 1) {
      dirs[ Vector3D.direction(p1, p2, p3, pts[i]) + 1 ] += 1;
    }
    
    if ( (dirs[0] > 0 && dirs[2] > 0) || (dirs[1] === pts.length) ) {
      return 0;
    } else if ( dirs[0] > 0 ) {
      return -1;
    }

    return 1;
    
  }

  reflect(p1: Vector3D, p2: Vector3D, p3: Vector3D, preserveOrientation?: boolean): Sticker {
    return this.reflect1( p1, Vector3D.cross(p1, p2, p3), preserveOrientation );
  }

  reflect1(a: Vector3D, _u: Vector3D, preserveOrientation?: boolean): Sticker {
    let u = _u.unit();
    let s = this.clone(true);    
    let dist = (p: Vector3D) => p.sub(a).dot(u);

    s.points = this.points.map(p => p.add( u.mul( -2 * dist(p) ) ));
    if ( preserveOrientation ) {
      s.reverse(true);
    }
    s._cached_mass_center = s._cached_mass_center.add( u.mul( -2 * dist(s._cached_mass_center) ) );
    s.vecs = s.vecs.map(v => v.add( u.mul( -2 * v.dot(u) ) ));
    return s;
  }

  reverse(self ?: boolean): Sticker {
    if ( self ) {
      this.points.reverse();
      this.points.unshift( this.points[ this.points.length - 1 ] );
      this.points.pop();
      return this;
    }
    let s = this.clone(true);
    s.points = this.points.map(p => p.clone()).reverse();
    s.points.unshift( s.points[ s.points.length - 1 ] );
    s.points.pop();
    return s;
  }

  contains(p: Vector3D): boolean {
    let u = this.points[this.points.length - 1];
    let zProduct = 0;
    let product: Vector3D;

    for (const v of this.points) {
      product = u.sub(v).cross( u.sub(p) );
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
    
    if ( this.color != s.color || p1.length != p2.length ) {
      return false;
    }

    for (let i = 0, maxi = p1.length; i < maxi; i += 1) {
      if ( p1[i].sub(p2[i]).abs() > 1e-6 ) {
        return false;
      }
    }

    return true;
  }
}