import { CENTER, Vector3D } from './../vector3d';
import { Sticker } from './Sticker';
import type { PuzzleInterface } from '@interfaces';
import { FaceSticker } from './FaceSticker';
import { lineIntersection3D } from '@helpers/math';
import { ImageSticker } from './ImageSticker';
import { EPS } from '@constants';

export function assignColors(p: PuzzleInterface, cols ?: string[]) {
  let colors = cols || [ 'y', 'o', 'g', 'w', 'r', 'b' ];

  let stickers: Sticker[] = p.getAllStickers();
  let pieces = p.pieces;

  // Adjust -1, 0 and 1 values for better precision
  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    let sticker = stickers[i];
    let points = sticker.points;
    for (let j = 0, maxj = points.length; j < maxj; j += 1) {
      for (let k = -1; k <= 1; k += 1) {
        if ( Math.abs( points[j].x - k ) < EPS ) {
          points[j].x = k;
        }
        if ( Math.abs( points[j].y - k ) < EPS ) {
          points[j].y = k;
        }
        if ( Math.abs( points[j].z - k ) < EPS ) {
          points[j].z = k;
        }
      }

    }
  }

  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    if ( stickers[i].nonInteractive || stickers[i] instanceof ImageSticker ) continue;

    let sticker = stickers[i];
    let p1 = sticker.getMassCenter();
    let u = sticker.getOrientation();
    let dirs = [0, 0, 0];
    let ok = false;

    for (let j = 0, maxj = pieces.length; j < maxj; j += 1) {
      dirs[ pieces[j].direction1(p1, u, true) + 1] += 1;

      if ( dirs[0] > 0 && dirs[2] > 0 ) {
        sticker.color = 'x';
        sticker.oColor = 'x';
        ok = true;
        break;
      }
    }

    if ( !ok ) {
      if ( dirs[0] > 0 ) {
        for (let j = 0, maxj = colors.length; j < maxj; j += 1) {
          if ( u.sub( p.faceVectors[j] ).abs() < EPS ) {
            sticker.color = colors[j];
            sticker.oColor = colors[j];
            break;
          }
        }
      } else {
        sticker.color = 'x';
        sticker.oColor = 'x';
      }
    }
  }
}

export function getAllStickers(): Sticker[] {
  
  let res = [];
  // @ts-ignore
  let pieces = this.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let stickers = pieces[i].stickers;
    res.push(...stickers);
  }

  return res;

}

export function scaleSticker(st: Sticker, scale: number): Sticker {
  const SCALE = scale || 0.925;
  let n = st.getOrientation();
  let cm = st.updateMassCenter();
  return st.sub(cm).mul(SCALE).add(cm).add( n.mul(0.005) );
}

export function roundStickerCorners(s: Sticker, rd?: number | Function, scale?: number, ppc?: number): Sticker {
  const RAD = rd || 0.11;
  const RAD_FN = typeof rd === 'function' ? rd : () => RAD;
  const PPC = ppc || 10;
  const C2k = [ 1, 2, 1 ];
  const SCALE = scale || 0.925;
  const PI_2 = Math.PI / 2;

  let st = s;
  let pts = st.points;
  let newSt = new Sticker();

  for (let i = 0, maxi = pts.length; i < maxi; i += 1) {
    let r = RAD_FN(s, i);
    let isCircle = Array.isArray(r) && r.length === 1;
    let isEllipse = Array.isArray(r) && r.length > 1;
    let seg_perc = (isCircle || isEllipse) ? r[0] : r;
    let seg_perc1 = isEllipse ? (typeof r[1] != 'boolean' ? r[1] : r[0]) : isCircle ? r[0] : r;
    let v1 = pts[ (i - 1 + maxi) % maxi ].sub( pts[i] ).mul( seg_perc );
    let v2 = pts[ (i + 1) % maxi ].sub( pts[i] ).mul( seg_perc1 );

    if ( isEllipse && typeof r[1] === 'boolean' ) {

      if ( v1.abs() < v2.abs() ) {
        v2 = v2.setLength( v1.abs() );
      } else {
        v1 = v1.setLength( v2.abs() );
      }

      isCircle = true;
    }

    let P = [ pts[i].add(v1), pts[i], pts[i].add(v2) ];
    
    let u = Vector3D.cross(P[0], P[1], P[2]).unit();

    if ( isCircle && Math.abs(v1.abs() - v2.abs()) < EPS ) {
      let center = lineIntersection3D(P[0], v1.rotate(CENTER, u, PI_2), P[2], v2.rotate(CENTER, u, PI_2));
      
      if ( center ) {
        let sides = [v1.abs(), v2.abs(), v1.sub(v2).abs()];
        let ang = Math.PI - Math.acos( (sides[2] ** 2 - sides[0] ** 2 - sides[1] ** 2) / (-2 * sides[0] * sides[1]) );
  
        for (let j = 0; j <= PPC; j += 1) {
          let a = j / PPC;
          newSt.points.push( P[0].rotate(center, u, a * ang) );
        }

        continue;
      }
    }

    for (let j = 0; j <= PPC; j += 1) {
      let a = j / PPC;
      newSt.points.push(
        P.reduce((ac: Vector3D, p: Vector3D, pos: number) => {
          return ac.add( p.mul( C2k[pos] * Math.pow(1 - a, 2 - pos) * Math.pow(a, pos) ) )
        }, new Vector3D())
      );
    }
  }

  return scaleSticker(newSt, SCALE);
}

export function roundCorners(p: PuzzleInterface, rd ?: number, scale ?: number, ppc ?: number, fn ?: Function, justScale ?: boolean) {
  if ( p.isRounded ) {
    return;
  }

  const CHECK = fn || ((s: Sticker) => !(s instanceof FaceSticker) && !(s instanceof ImageSticker));
  
  p.isRounded = true;
  let pieces = p.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let pc = pieces[i];
    let s = pc.stickers;

    for (let j = 0, maxj = s.length; j < maxj; j += 1) {
      if ( !CHECK(s[j]) ) {
        continue;
      }

      let newSt = (justScale)
        ? scaleSticker(s[j], 0)
        : roundStickerCorners(s[j], rd, scale, ppc);

      newSt.updateMassCenter();

      newSt.color = s[j].color;
      newSt.oColor = s[j].oColor;
      newSt.vecs = s[j].vecs.map(e => e.clone());
      
      s[j].color = 'd';
      s[j].oColor = 'd';
      newSt._generator = s[j];
      s[j]._generated = newSt;

      if ( s[j].nonInteractive ) {
        pc.stickers.splice(j, 1, newSt);
      } else {
        pc.stickers.push( newSt );
      }

    }

  }
}

export function assignVectors(p: PuzzleInterface) {
  let pieces = p.pieces;

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let stickers = pieces[i].stickers;
    let vecs = pieces[i].stickers.reduce((ac: Vector3D[], s) => {
      if ( s.color != 'x' && s.color != 'd' ) {
        ac.push( s.getOrientation() );
      }
      return ac;
    }, []);

    for (let j = 0, maxj = stickers.length; j < maxj; j += 1) {
      if ( stickers[j].color != 'x' && stickers[j].color != 'd' ) {
        stickers[j].vecs = vecs.map(e => e.clone());
      }
    }
  }
}

export function random(a: any) {
  if ( Array.isArray(a) || typeof a === 'string' ) {
    return a[ ~~(Math.random() * a.length) ];
  } else if ( typeof a === 'object' ) {
    let k = Object.keys(a);
    return a[ k[~~(Math.random() * k.length) ] ];
  }

  return ~~(Math.random() * a);
}