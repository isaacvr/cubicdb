import { Vector3D } from './../vector3d';
import { Sticker } from './Sticker';

export class FaceSticker extends Sticker {
  faces: number[][];
  // faceColor: number[];
  constructor(pts: Vector3D[], faces: number[][], color?: string, vecs ?: Vector3D[]) {
    super(pts, color, vecs);
    this.faces = faces.map(e => e.map(e1 => e1));
    // this.faceColor = [ new Color(255, 255, 255).toNumber() ];
  }

  getOrientation(): Vector3D {
    let num = this.faces.length;
    let sum = this.faces.reduce((ac, f) => {
      return ac.add( Vector3D.cross(this.points[f[0]], this.points[f[1]], this.points[f[2]]).unit() );
    }, new Vector3D());
    return sum.div(num, true).unit();
  }

  // getFaceColor(index: number): number {
  //   let len = this.faceColor.length;
  //   return this.faceColor[ index % len ];
  // }

  clone(excludePoints ?: boolean): FaceSticker {
    // console.log('FaceSticker Clone()');
    let s = new FaceSticker(excludePoints ? [] : this.points, this.faces);
    s.color = this.color;
    s.oColor = this.oColor;
    s._cached_mass_center = this._cached_mass_center.clone();
    s.vecs = this.vecs.map(e => e.clone());
    // s.boundingBox = this.boundingBox.map(e => e.clone());
    // s.faceColor = this.faceColor.map(e => e);
    return s;
  }
}