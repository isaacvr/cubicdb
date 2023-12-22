import { UP, BACK, DOWN, CENTER, RIGHT, FRONT } from './../vector3d';
import { Vector3D } from '../../classes/vector3d';
import type { PuzzleInterface } from '@interfaces';
import { Piece } from './Piece';
import { Sticker } from './Sticker';
import { assignColors, getAllStickers, random } from './puzzleUtils';
import { STANDARD_PALETTE } from '@constants';
import { ScrambleParser } from '@classes/scramble-parser';

export function MEGAMINX(_n: number, headless?: false): PuzzleInterface {
  // const n = Math.max(3, ~~(_n / 2) * 2 + 1);
  const n = Math.max(2, ~~_n);
  const n_2 = ~~(n / 2);

  const mega: PuzzleInterface = {
    pieces: [],
    palette: STANDARD_PALETTE,
    rotation: {},
    center: new Vector3D(0, 0, 0),
    faceVectors: [],
    getAllStickers: () => [],
    dims: [],
    faceColors: [ "white", "yellow", "violet", "green", "red", "blue", "orange", "lblue", "lyellow", "pink", "lgreen", "gray" ],
    move: () => false,
    roundParams: [],
  };

  mega.getAllStickers = getAllStickers.bind(mega);
  let pieces = mega.pieces;

  const PI = Math.PI;
  const sq = Math.sqrt;
  const F_INT = sq( (50 + 22 * sq(5) ) / 5 ) / 4;
  const F_EXT = sq(6) / 4 * sq(3 + sq(5));
  const R_INT = 1;
  const SIDE = R_INT / F_INT;
  const R_EXT = SIDE * F_EXT;
  const RAD = sq( R_EXT ** 2 - R_INT ** 2 );
  const FACTOR = 2 / (2 * n - n % 2);
  const FACE_ANG = PI - Math.acos( Math.tan(18 * PI / 180) * Math.tan(54 * PI / 180) );
  const INNER_ANG = 2 * PI / 5;
  const PI23 = PI * 2 / 3;

  let anchors: Vector3D[] = [];

  for (let i = 0; i < 5; i += 1) {
    anchors.push( UP.mul(R_INT).add( BACK.mul(RAD).rotate(CENTER, UP, i * INNER_ANG) ) );
  }

  const V1: Vector3D = anchors[1].sub(anchors[0]).mul(FACTOR);
  const V11: Vector3D = V1.rotate(CENTER, anchors[0], -PI23);
  const V2: Vector3D = anchors[4].sub(anchors[0]).mul(FACTOR);
  const V3: Vector3D = anchors[2].sub(anchors[1]).mul(FACTOR);
  const V4: Vector3D = anchors[0].sub(anchors[1]).mul(FACTOR);
  
  let topFace: Piece[] = [];
  let n1 = UP.rotate(CENTER, anchors[0], PI23);
  let n2 = UP.rotate(CENTER, anchors[0], -PI23);

  /// Generate stickers without the central star
  for (let i = 0; i <= n_2; i += 1) {
    for (let j = 0; j < n_2; j += 1) {
      if ( i < n_2 ) {
        let st = new Sticker([
          anchors[0].add( V1.mul(i) ).add( V2.mul(j) ),
          anchors[0].add( V1.mul(i + 1) ).add( V2.mul(j) ),
          anchors[0].add( V1.mul(i + 1) ).add( V2.mul(j + 1) ),
          anchors[0].add( V1.mul(i) ).add( V2.mul(j + 1) ),
        ], '', [ UP, n1, n2 ]);

        topFace.push( new Piece([
          st,
          st.add(V11),
        ]));
      }
      if ( i == n_2 ) {
        let st = new Sticker([
          anchors[0].add( V1.mul(n_2) ).add( V2.mul(j) ),
          anchors[1].add( V4.mul(n_2) ).add( V3.mul(j) ),
          anchors[1].add( V4.mul(n_2) ).add( V3.mul(j + 1) ),
          anchors[0].add( V1.mul(n_2) ).add( V2.mul(j + 1) ),
        ], '', [ UP, n2 ]);
        topFace.push( new Piece([
          st,
          st.sub(st.getMassCenter()).div(2).add(st.getMassCenter().add(V11.proj(DOWN))),
        ]));
      }
    }
  }

  let topCenter = [
    anchors[0].add( V1.add(V2).mul(n_2) )
  ];

  for (let i = 1; i < 5; i += 1) {
    topCenter.push( topCenter[0].rotate(CENTER, UP, INNER_ANG * i) );
  }
  
  for (let j = 1; j < 5; j += 1) {
    for (let i = 0, maxi = n_2 * (n_2 + 1); i < maxi; i += 1) {
      topFace.push( topFace[i].rotate(CENTER, UP, j * INNER_ANG) );
    }
  }

  let center = new Piece([
    new Sticker(topCenter, 'b'),
    new Sticker(topCenter).add( new Vector3D(0, V11.y, 0) )
  ]);

  topFace.push( center );

  let midUpFace: Piece[] = [ ...topFace ];

  for (let i = 0; i < 5; i += 1) {
    let c = anchors[i];
    for (let j = 0, maxj = topFace.length; j < maxj; j += 1) {
      midUpFace.push( topFace[j].rotate(c, c, PI23) );
    }
  }

  let midDownFace: Piece[] = midUpFace.map(p => 
    p.reflect1(CENTER, UP, true).rotate(CENTER, UP, INNER_ANG / 2, true)
  );

  pieces.push( ...midUpFace );
  pieces.push( ...midDownFace );

  let st_corner = new Sticker([
    anchors[0], anchors[0].add( V1 ), anchors[0].add( V1.add(V2) ), anchors[0].add( V2 ),
  ], 'white');

  let corner = new Piece([
    st_corner,
    st_corner.rotate( anchors[0], UP, 3 * PI / 5 ).rotate(anchors[0], V2, FACE_ANG - PI),
    st_corner.rotate( anchors[0], UP, -3 * PI / 5 ).rotate(anchors[0], V1, PI - FACE_ANG),
  ]);

  let midCenters: Piece[] = [];

  [0, 1, 2, 3, 4].forEach(i => midCenters.push( center.reflect(CENTER, anchors[i], anchors[ (i + 1) % 5 ], true) ));

  midCenters.push(
    ...midCenters.map(p => p.reflect(CENTER, CENTER.add(RIGHT), CENTER.add(FRONT), true)
                            .rotate(CENTER, UP, PI / 5))
  );

  mega.faceVectors.push( center.stickers[0].getOrientation() );

  for (let i = 0, maxi = midCenters.length; i < maxi; i += 1) {
    mega.faceVectors.push( midCenters[i].stickers[0].getOrientation() );
  }

  mega.faceVectors.push(center.stickers[0].getOrientation().rotate(CENTER, RIGHT, PI) );

  let LDIST = Math.abs( corner.stickers[1].points[2].sub(anchors[0]).y );

  let getPointsFromSticker = (s: Sticker) => {
    let mc = s.getMassCenter();
    return s.points.map(p => p.add( mc.unit().mul(-LDIST) ))
  };

  let planes = [
    getPointsFromSticker(center.stickers[0]), // U
    getPointsFromSticker(midCenters[1].stickers[0]), // L
    getPointsFromSticker(midCenters[2].stickers[0]), // F
    getPointsFromSticker(midCenters[3].stickers[0]), // R
    getPointsFromSticker(midCenters[6].stickers[0]), // dL
    getPointsFromSticker(midCenters[7].stickers[0]), // dR
    getPointsFromSticker(midCenters[0].stickers[0]), // bL
    getPointsFromSticker(midCenters[4].stickers[0]), // bR
    center.stickers[0].points.map(p => p.clone()), // [u]
    midCenters[1].stickers[0].points.map(p => p.clone()), // [l]
    midCenters[2].stickers[0].points.map(p => p.clone()), // [f]
    midCenters[3].stickers[0].points.map(p => p.clone()), // [r]
  ];

  let trySingleMove = (mv: any): { pieces: Piece[], u: Vector3D, ang: number } | null => {
    let moveId = mv[0];
    let turns = mv[1];
    const pts1 = planes[moveId].map(e => e.clone());
    const u = Vector3D.cross(pts1[0], pts1[1], pts1[2]).unit();
    const ang = INNER_ANG * turns;
    
    let pcs = [];

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let d = pieces[i].direction1(pts1[0], u, true);
      
      if ( d === 0 ) {
        console.log("Invalid move. Piece intersection detected.", "URFDLB"[moveId], turns, mv);
        console.log("Piece: ", i, pieces[i], pts1);
        return null;
      }
      
      if ( d * mv[2] > 0 ) {
        pcs.push( pieces[i] );
      }
    }

    return {
      pieces: pcs,
      u,
      ang
    };
  };

  mega.move = function(moves: any[]) {
    for (let m = 0, maxm = moves.length; m < maxm; m += 1) {
      let mv = moves[m];
      let pcs = trySingleMove(mv);

      if ( !pcs ) {
        return false;
      }
      
      let { u, ang } = pcs;
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }
    
    return true;
  };

  mega.toMove = function(pc: Piece, st: Sticker, u: Vector3D) {
    let mc = st.getMassCenter();
    return {
      pieces: pieces.filter(p => p.direction1(mc, u) == 0),
      ang: INNER_ANG,
    };
  };

  mega.scramble = function() {
    if ( !mega.toMove ) return;

    const MOVES = n >= 2 ? (n - 2) * 50 + 10 : 0;

    for (let i = 0; i < MOVES; i += 1) {
      let p = random( pieces ) as Piece;
      if ( !p ) { i -= 1; continue; }
      let s = random(p.stickers.filter(s => !/^[xd]{1}$/.test(s.color))) as Sticker;
      if ( !s ) { i -= 1; continue; }
      let vec = random(s.vecs.filter(v => v.unit().sub(s.getOrientation()).abs() > 1e-6));
      if ( !vec ) { i -= 1; continue; }
      let pcs = mega.toMove(p, s, vec);
      let cant = 1 + random(3);
      pcs.pieces.forEach((p: Piece) => p.rotate(CENTER, vec, pcs.ang * cant, true));
    }
  };

  mega.applySequence = function(seq: string[]) {
    let moves = seq.map( mv => ScrambleParser.parseMegaminx( mv )[0]);
    let res: { u: Vector3D, ang: number, pieces: string[] }[] = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let pcs;
      
      try {
        pcs = trySingleMove(moves[i]);
      } catch(e) {
        console.log("ERROR: ", seq[i], moves[i], e);
      }

      if ( !pcs ) {
        console.log("NO PIECES");
        continue;
      }

      let { u, ang } = pcs;
      res.push({ u, ang, pieces: pcs.pieces.map(p => p.id) });
      pcs.pieces.forEach(p => p.rotate(CENTER, u, ang, true));
    }

    return res;
  };

  mega.rotation = {
    x: PI / 6,
    y: -PI / 4,
    z: 0,
  };

  assignColors(mega, mega.faceColors);
  // roundCorners(mega);

  mega.raw = [ anchors, FACE_ANG, FACTOR, RAD, SIDE ];

  let isCenter = (p: Piece) => {
    let st = p.stickers.filter(s => s.points.length === 5);
    return st.length === 2;
  };

  for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
    let p = pieces[i];

    if ( isCenter(p) ) continue;

    for (let j = 0, maxj = p.stickers.length; j < maxj; j += 1) {
      let s = p.stickers[j];
      if ( headless && (s.color === 'x' || s.color === 'd')) {
        p.stickers.splice(j, 1);
        j -= 1; maxj -= 1;
      } else {
        s.color = (s.color === 'x') ? 'd' : s.color;
      }
    }

    if ( p.stickers.length === 0 ) {
      pieces.splice(i, 1);
      i -= 1; maxi -= 1;
    }
  }

  return mega;
  
}