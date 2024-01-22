import type { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundStickerCorners } from "@classes/puzzle/puzzleUtils";
import { Vector2D } from "@classes/vector2-d";
import { BACK, CENTER, DOWN, FRONT, LEFT, RIGHT, UP, Vector3D } from "@classes/vector3d";
import { CubeMode } from "@constants";
import { map } from "@helpers/math";

export async function projectedView(cube: Puzzle, DIM: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx: any = canvas.getContext('2d');

  let W = DIM * 4 / 2;
  let H = DIM * 3 / 2;
  const PI = Math.PI;
  const PI_2 = PI / 2;
  const PI_3 = PI / 3;
  const PI_6 = PI / 6;
  const FACTOR = 2.1;
  let LW = DIM * 0.007;
  const SPECIAL_SQ1 = [CubeMode.CS, CubeMode.EO, , CubeMode.CO];

  const getFactor = () => {
    if ( cube.type === 'square1' && SPECIAL_SQ1.some(m => m === cube.mode) ) {
      return 1.6;
    }

    return FACTOR;
  };

  if ( cube.type === 'pyraminx' ) {
    H = W / 1.1363636363636365;
  } else if ( cube.type === 'square1' ) {
    W += H; // swap W and H
    H = W - H;
    W = W - H;
    W *= 0.62;
    // W = H / 2.5;
  } else if ( cube.type === 'megaminx' ) {
    W = H * 2;
    LW = H * 0.004;
  }
 
  canvas.width = W;
  canvas.height = H;
  ctx.lineWidth = LW;

  let colorFilter = [ 'd' ];

  if ( cube.type === 'square1' || cube.mode === CubeMode.NORMAL ) {
    colorFilter.push('x');
  }

  let stickers = cube.getAllStickers().filter(s => colorFilter.indexOf(s.color) === -1);

  let sideStk: { [name: string]: Sticker[] } = {};

  let faceVectors = cube.p.faceVectors;
  let faceName = [ 'U', 'R', 'F', 'D', 'L', 'B' ];
  let fcTr: any[] = [
    [ CENTER, RIGHT, PI_2, UP, FACTOR ],
    [ CENTER, UP, -PI_2, RIGHT, FACTOR ],
    [ CENTER, RIGHT, 0, UP, 0 ], /// F = no transform
    [ CENTER, LEFT, PI_2, DOWN, FACTOR ],
    [ CENTER, UP, PI_2, LEFT, FACTOR ],
    [ CENTER, UP, PI, RIGHT, FACTOR * 2 ],
  ];
  let SQ1_A1: Vector3D[] = [];
  let SQ1_A2: Vector3D[] = [];

  for (let i = 0; i < 12; i += 1) {
    SQ1_A1.push( BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.38036823524362) );
    SQ1_A2.push( BACK.rotate(CENTER, UP, PI_6 * i + PI_6 / 2).mul(1.88561808632825) );
  }

  if ( cube.type === 'pyraminx' ) {
    faceName = [ 'F', 'R', 'D', 'L' ];
  } else if ( cube.type === 'square1' ) {
    faceVectors = [ UP, DOWN, RIGHT.add(BACK).add(UP) ];
    faceName = [ 'U', 'D', 'M' ];
  } else if ( cube.type === 'megaminx' ) {
    let raw = cube.p.raw;
    let ac = raw[0];
    let FACE_ANG = raw[1];
    faceName = [
      "U",
      "MU1", "MU2", "MU3", "MU4", "MU5",
      "MD1", "MD2", "MD3", "MD4", "MD5",
      "D"
    ];
    fcTr = [
      [ CENTER, UP, 0, UP, 0 ], /// no transform
    ];

    for (let i = 0; i < 5; i += 1) {
      fcTr.push([
        ac[i % 5], ac[ (i + 1) % 5 ].sub(ac[i % 5]), FACE_ANG - PI, UP, 0
      ]);
    }

    for (let i = 0; i < 6; i += 1) {
      fcTr.push([ CENTER, UP, 0, UP, 0 ]);
    }
  }

  for (let i = 0, maxi = faceName.length; i < maxi; i += 1) {
    sideStk[ faceName[i] ] = [];
  }

  for (let i = 0, maxi = stickers.length; i < maxi; i += 1) {
    let st = stickers[i];
    let uv = st.getOrientation();
    let ok = false;
    for (let j = 0, maxj = faceVectors.length; j < maxj && !ok; j += 1) {
      if ( faceVectors[j].sub( uv ).abs() < 1e-6 ) {
        if ( ['rubik', 'ivy', 'skewb', 'megaminx'].indexOf(cube.type) > -1 ) {
          sideStk[ faceName[j] ].push(
            st.rotate(fcTr[j][0], fcTr[j][1], fcTr[j][2]).add( fcTr[j][3].mul(fcTr[j][4]) )
          );
        } else {
          sideStk[ faceName[j] ].push(st);
        }
        ok = true;
      }
    }

    if ( !ok && cube.type === 'square1' ) {
      if ( st.color != 'd' && st.color != 'x' ) {
        let pts = st._generator.points.filter(p => {
          return Math.abs(p.y) >= 1 - 1e-6;
        });

        
        if ( pts.length > 0 ) {
          if ( !SPECIAL_SQ1.some(m => cube.mode === m) ) {
            
            // let pt = st._generator.points.find(p => {
            //   return Math.abs(p.y) < 1;
            // });
            
            // let f = st._generator.name === 'side-corner' ?
            //   -Math.sign( st.getOrientation().dot(Vector3D.cross(pts[0], pts[1], pt!)) ) : 1;

            let st1 = st._generator.clone();
            st1.points.map(p => p.y = (p.y + pts[0].y) / 2);
            st1.updateMassCenter();
            st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2 * 1, true);

            let f = st1.points[0].y * st1.getOrientation().dot(UP) ;

            if ( f < 0 ){
              st1.rotate(pts[0], pts[0].sub(pts[1]), PI_2 * 2, true);
            }

            let points = st1.points;
            let ini = f > 0 ? 1 : 2;

            for (let j = ini; j <= ini + 1; j += 1) {
            // for (let j = 0, maxj = points.length; j < maxj; j += 1) {
              let anchors = SQ1_A1;
              
              let pj = points[j].clone();
              pj.y = 0;

              if ( pj.abs() > 1.5) {
                anchors = SQ1_A2;
              }

              anchors.sort((a, b) => a.sub(pj).abs() - b.sub(pj).abs());

              let closer = anchors[0];
              points[j].x = closer.x;
              points[j].z = closer.z;
            }

            let rounded = cube.options.rounded ? roundStickerCorners(st1, ...cube.p.roundParams) : st1;
            rounded.color = st.color;
            rounded.oColor = st.oColor;

            if ( pts[0].y > 0 ) {
              sideStk.U.push( rounded );
            } else {
              sideStk.D.push( rounded ); 
            }
          }
        } else {
          let isFront = st._generator.points.reduce((ac, p) => ac && p.z >= 1, true);
          
          if ( isFront ) {
            let st1 = st.clone();
            let f = SPECIAL_SQ1.some(m => m === cube.mode) ? 1 : 4 / 3;
            st1.points.map(p => {p.y /= 2; p.x *= f;});
            sideStk.M.push(st1);
          }
        }
      }
    }
  }

  if ( cube.type === 'pyraminx' ) {
    let PU = UP.mul(1.59217);
    let PR = DOWN.mul(0.53072).add( FRONT.mul(1.5011) ).rotate(CENTER, UP, PI_3);
    let PB = PR.rotate(CENTER, UP, 2 * PI_3);
    let PL = PB.rotate(CENTER, UP, 2 * PI_3);
    let MLR = PL.add(PR).div(2);

    const ANG = 0.4048928432892675;
    const ANG1 = PI_2 + ANG;

    sideStk.F = sideStk.F.map(s => s.rotate(MLR, RIGHT, ANG));
    sideStk.R = sideStk.R.map(s => s.rotate(PR, PR.sub(PU), ANG1).rotate(MLR, RIGHT, ANG));
    sideStk.D = sideStk.D.map(s => s.rotate(PR, PL.sub(PR), ANG1).rotate(MLR, RIGHT, ANG));
    sideStk.L = sideStk.L.map(s => s.rotate(PU, PU.sub(PL), ANG1).rotate(MLR, RIGHT, ANG));

    let cm1 = sideStk.R.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D()).div(sideStk.R.length).setLength(0.15);
    let cm2 = sideStk.D.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D()).div(sideStk.D.length).setLength(0.15);
    let cm3 = sideStk.L.reduce((a, s) => a.add(s.getMassCenter()), new Vector3D()).div(sideStk.L.length).setLength(0.15);
    
    sideStk.R = sideStk.R.map(s => s.add(cm1) );
    sideStk.D = sideStk.D.map(s => s.add(cm2) );
    sideStk.L = sideStk.L.map(s => s.add(cm3) );
  } else if ( cube.type === 'square1' ) {
    sideStk.U = sideStk.U.map(st => st.rotate(CENTER, RIGHT, PI_2).add( UP.mul( getFactor() ) ));
    sideStk.D = sideStk.D.map(st => st.rotate(CENTER, RIGHT, -PI_2).add( DOWN.mul( getFactor() ) ));
  } else if ( cube.type === 'megaminx' ) {
    let raw = cube.p.raw;
    let FACE_ANG = raw[1];
    let F = raw[2];
    let R = raw[3];
    let SIDE = raw[4];
    let alpha = 2 * PI / 5;
    let beta = (PI - alpha) / 2;
    let D = SIDE * F * Math.sin(alpha) / Math.sin(beta);
    let r = R - D;

    // This type of piece is ensured to be inside the list
    let ac1 = (cube.p.pieces.find(p => {
      let st = p.stickers.filter(s => s.points.length === 5);
      return st.length === 2 && st[0].getOrientation().sub(DOWN).abs() < 1e-6;
    }) as Piece).stickers[0].add(UP).mul(R / r).add(DOWN).points;

    let pts1: Vector3D[] = [];
    let pts2: Vector3D[] = [];
    for (let i = 0; i < 6; i += 1) {
      sideStk[ faceName[i] ] = sideStk[ faceName[i] ].map(s => {
        let newS = s.rotate(CENTER, RIGHT, PI_2);
        pts1.push(...s.points);
        return newS;
      });
    }
    for (let i = 6; i < 12; i += 1) {
      let pts = sideStk[ faceName[i] ][0].points;
      for (let j = 0, j1 = 1; j < 5 && i < 11; j += 1) {
        if ( Vector3D.direction(pts[0], pts[1], pts[2], ac1[j]) === 0 &&
             Vector3D.direction(pts[0], pts[1], pts[2], ac1[j1]) === 0) {
          sideStk[ faceName[i] ] = sideStk[ faceName[i] ].map(s => {
            return s.rotate(ac1[j], ac1[j1].sub(ac1[j]), FACE_ANG - PI);
          });
          break;
        }
        j1 = (j1 + 1) % 5;
      }
      sideStk[ faceName[i] ] = sideStk[ faceName[i] ].map(s => {
        let newS = s.rotate(CENTER, FRONT, PI).rotate(CENTER, RIGHT, PI_2);
        pts2.push(...newS.points);
        return newS;
      });
    }
    pts1.sort((p1, p2) => p2.x - p1.x);
    pts2.sort((p1, p2) => p1.x - p2.x);
    let vec = pts1[5].sub(pts2[0]);
    vec.y *= -1;
    vec.z = 0;
    for (let j = 6; j < 12; j += 1) {
      sideStk[ faceName[j] ] = sideStk[ faceName[j] ].map(s => s.add(vec));
    }
  }

  let allStickers: Sticker[] = [];

  for (let i = 0, maxi = faceName.length; i < maxi; i += 1) {
    allStickers.push(...sideStk[ faceName[i] ]);
  }

  let _min = Math.min;
  let _max = Math.max;

  let limits = [ Infinity, -Infinity, Infinity, -Infinity ];
  
  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    let pts = allStickers[i].points;
    pts.forEach(p => {
      limits[0] = _min(limits[0], p.x); limits[1] = _max(limits[1], p.x);
      limits[2] = _min(limits[2], p.y); limits[3] = _max(limits[3], p.y);
    });
  }

  allStickers.sort((s1, s2) => s1.color === 'd' ? -1 : 1);
  
  const PAD = 2;
  const F = _min( (W - 2 * PAD) / (limits[1] - limits[0]), (H - 2 * PAD) / (limits[3] - limits[2]) );
  let v1 = new Vector2D(limits[0], limits[2]);
  let v2 = new Vector2D(limits[1], limits[3]);
  let vdif = v2.sub(v1).mul(F);
  let offset = new Vector2D(W / 2, H / 2).sub(new Vector2D(vdif.x / 2, vdif.y / 2));

  for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
    ctx.fillStyle = cube.getHexStrColor( allStickers[i].color );
    let pts = allStickers[i].points;

    ctx.beginPath();

    for (let j = 0, maxj = pts.length; j < maxj; j += 1) {
      let x = map(pts[j].x, limits[0], limits[1], 0, vdif.x) + offset.x;
      let y = map(pts[j].y, limits[2], limits[3], 0, vdif.y) + offset.y;
      if ( j === 0 ) {
        ctx.moveTo(x, H - y);
      } else {
        ctx.lineTo(x, H - y);
      }
    }
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
  }

  if ( cube.type === 'megaminx' ) {
    let LX = W * 0.251;
    let LY = H * 0.457;
    let fontWeight = W * 0.05;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    ctx.font = fontWeight + "px verdana, sans-serif";
    ctx.fillText("U", LX, LY);
    ctx.fillText("F", LX, LY * 1.75);
  }

  return await new Promise((res) => canvas.toBlob(b => res(b || new Blob([])), 'image/jpg'));
}