import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { Vector2D } from "@classes/vector2-d";
import { CENTER, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { EPS } from "@constants";
import { map } from "@helpers/math";

export async function planView(cube: Puzzle, DIM: number): Promise<Blob> {
  // if ( [ 'rubik', 'skewb', 'ivy' ].indexOf(cube.type) > -1 ) {
  if ( [ 'rubik' ].indexOf(cube.type) > -1 ) {
    let canvas = document.createElement('canvas');
    canvas.width = DIM;
    canvas.height = DIM;
    let ctx: any = canvas.getContext('2d');
    const PI_2 = Math.PI / 2;
    const order = cube.order[0];
    const LW = Math.max(2, DIM / 100);
    const PAD = DIM / 10;
    const ALL_PAD = LW + PAD;
    const mSticker = (DIM - ALL_PAD * 2) / (order + 1) / 2 + ALL_PAD;
    
    roundCorners(cube.p, ...cube.p.roundParams);

    let allStickers = cube.getAllStickers();

    // Top face stickers
    let stickers = allStickers
      .filter(s => {
        if ( s.color === 'd' ) {
          return false;
        }
        let p = s.points;
        let u = s.getOrientation();
        return p[0].y >= 1 - EPS && UP.sub(u).abs2() < 1e-4;
      })
      .map(s => s.rotate(CENTER, RIGHT, PI_2))
      .sort((a: Sticker, b: Sticker) => {
        let ca = a._generator.updateMassCenter(), cb = b._generator.updateMassCenter();

        if ( Math.abs( ca.y - cb.y ) < EPS ) {
          return ca.x - cb.x;
        }

        return cb.y - ca.y;
      });

    ctx.strokeStyle = '7px solid #000000';
    ctx.lineWidth = LW;

    let mapVector = function(x: number, y: number) {
      return new Vector2D(
        map(x, -1, 1, mSticker, DIM - mSticker),
        map(y, -1, 1, mSticker, DIM - mSticker)
      );
    };

    let render = function(st: Sticker[]) {
      for (let i = 0, maxi = st.length; i < maxi; i += 1) {
        ctx.fillStyle = cube.getHexStrColor( st[i].color );
        let pts = st[i].points;
  
        ctx.beginPath();
  
        for (let j = 0, maxj = pts.length; j < maxj; j += 1) {
          let v = mapVector( pts[j].x, pts[j].y );

          if ( j === 0 ) {
            ctx.moveTo(v.x, DIM - v.y);
          } else {
            ctx.lineTo(v.x, DIM - v.y);
          }
        }
        ctx.fill();
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Render the top layer
    render(stickers);

    // if ( cube.type === 'rubik' ) {
      
    let sideStikers = allStickers.filter(s => {
      if ( s.color === 'd' ) {
        return false;
      }

      let th = 1 - 2 / cube.order[0];
      let mc = s.getMassCenter();

      return mc.y > th && ( Math.abs(mc.x) > 1 - EPS || Math.abs(mc.z) > 1 - EPS );
    }).map(s => {
      let o = s.getOrientation();
      let ac = s._generator;
      let newS = s.rotate(
        new Vector3D(ac.points[0].x, 1, ac.points[0].z),
        o.cross(UP), PI_2
      );

      const factor = 2 / 3;
      let mc = s.updateMassCenter();
      let muls = [mc.x, mc.y, mc.z].map(n => Math.abs(Math.abs(n) - 1) < 1e-2 ? factor : 1);

      let mc1 = newS.updateMassCenter();
      newS.points.forEach(p => {
        p.x = (p.x - mc1.x) * muls[0] + mc1.x - o.x / order * (1 - factor);
        p.y = (p.y - mc1.y) * muls[1] + mc1.y - o.y / order * (1 - factor);
        p.z = (p.z - mc1.z) * muls[2] + mc1.z - o.z / order * (1 - factor);
      });
      return newS.rotate(CENTER, RIGHT, PI_2);
    });

    render(sideStikers);

    // Show arrows
    let swaps = cube.arrows;

    const tipLength = 0.06 * DIM;
    const tipAngle = Math.PI * 0.88;
    const elems = 5;

    for (let i = 0, maxi = (~~(swaps.length / elems) ) * elems; i < maxi; i += elems) {
      let x1 = swaps[i];
      let y1 = swaps[i + 1];
      let x2 = swaps[i + 2];
      let y2 = swaps[i + 3];
      let type = swaps[i + 4];

      if ( x1 < 0 || x1 >= order ||
          y1 < 0 || y1 >= order ||
          x2 < 0 || x2 >= order ||
          x2 < 0 || x2 >= order ) {
        continue;
      }

      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';

      let c1 = stickers[ x1 + y1 * order ].getMassCenter();
      let c2 = stickers[ x2 + y2 * order ].getMassCenter();

      let ini = mapVector(c1.x, -c1.y);
      let fin = mapVector(c2.x, -c2.y);
      let tip = fin.sub(ini).unit().mul( tipLength );
      let tip1 = fin.add( tip.rot( tipAngle ) );
      let tip2 = fin.add( tip.rot( -tipAngle ) );
      let tip3 = ini.sub( tip.rot( tipAngle ) );
      let tip4 = ini.sub( tip.rot( -tipAngle ) );
      let m1 = tip1.add(tip2).div(2);
      let m2 = tip3.add(tip4).div(2);

      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.lineTo(fin.x, fin.y);
      ctx.lineTo(tip1.x, tip1.y);
      ctx.lineTo(tip2.x, tip2.y);
      ctx.fill();
      ctx.stroke();

      if ( type != 0 ) {
        ctx.beginPath();
        ctx.lineTo(ini.x, ini.y);
        ctx.lineTo(tip3.x, tip3.y);
        ctx.lineTo(tip4.x, tip4.y);
        ctx.fill();
        ctx.stroke();
      }

      ctx.lineWidth = 4;
      ctx.lineCap = 'square';

      ctx.beginPath();
      ctx.moveTo(m1.x, m1.y);
      ctx.lineTo(type ? m2.x : ini.x, type ? m2.y : ini.y);
      ctx.stroke();

    }

    return await new Promise((res) => canvas.toBlob(b => res(b || new Blob([])), 'image/jpg'));
  }

  return new Blob([]);
}