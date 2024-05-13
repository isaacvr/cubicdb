import { DOWN, UP, Vector3D } from './../vector3d';
import type { Sticker } from './Sticker';
import { Color } from './../Color';
import { ScrambleParser } from './../scramble-parser';
import { CubeMode, EPS, strToHex } from '@constants';
import type { Piece } from './Piece';
import type { PuzzleInterface, PuzzleOptions, PuzzleType, CubeView } from '@interfaces';
import * as puzzles from './allPuzzles';
import { puzzleReg } from './puzzleRegister';
import { ImageSticker } from './ImageSticker';
import { solvFacelet } from '@cstimer/scramble/scramble_333';

void puzzles;

export class Puzzle {
  rotation: any;
  p: PuzzleInterface;
  order: number[];
  arrows: number[];

  type: PuzzleType;
  mode: CubeMode;
  view: CubeView;
  headless: boolean;
  img: string;
  options: PuzzleOptions;

  constructor(options: PuzzleOptions) {
    this.options = options;
    this.type = options.type || 'rubik';
    this.mode = options.mode || CubeMode.NORMAL;
    this.view = options.view || 'trans';
    this.headless = !!options.headless;
    this.img = '';
    this.arrows = [];

    this.options.sequence = this.options.sequence || '';

    if ( this.view === 'plan' ) {
      switch(this.type) {
        case 'megaminx':
        case 'pyraminx':
        case 'skewb':
        case 'square1':
          this.view = '2d';
          break; 
      }
    }

    if ( this.type === 'mirror' ) {
      this.view = 'trans';
      this.mode = CubeMode.NORMAL;
    }

    this.setTips(options.tips || []);

    let a: any[];

    if ( Array.isArray(options.order) ) {
      if ( options.order.length >= 3 ) {
        a = [ ...(options.order.slice(0, 3)) ];
      } else {
        a = [ ...options.order ];
        let idx = 0;
        while ( a.length < 3 ) {
          a.push( options.order[ idx ] );
          idx = (idx + 1) % options.order.length;
        }
      }
    } else if ( typeof options.order === 'number' ) {
      a = [ options.order, options.order, options.order ];
    } else {
      a = [ 3, 3, 3 ];
    }

    if ( ['megaminx', 'pyraminx'].indexOf(this.type) > -1 ) {
      a.length = 1;
    }

    a.push(this.headless);

    this.p = puzzleReg.get(this.type)?.constr.apply(null, a);

    this.order = a;
    this.rotation = this.p.rotation;

    this.adjustColors();

    if ( this.options.facelet && (this.type === 'rubik' || this.type === 'icarry') ) {
      this.applyFacelet( this.options.facelet );
    }

  }

  private applyFacelet(facelet: string) {
    let colors = "URFDLB";
    let fColors = facelet.split("");
    let vecs = this.p.faceVectors;
    let cols = this.p.faceColors;
    let allStickers = this.p.getAllStickers().filter(st => !(st instanceof ImageSticker));
    let stickers: Sticker[][] = vecs.map(_ => []);
    let getSort = (k1: keyof Vector3D, k2: keyof Vector3D, d1: number, d2: number) => {
      return (s1: Sticker, s2: Sticker) => {
        let m1 = s1.getMassCenter();
        let m2 = s2.getMassCenter();

        if ( m1[k1] != m2[k1] ) {
          return m1[k1] < m2[k1] ? d1 : -d1;
        }
        return m1[k2] < m2[k2] ? d2 : -d2;
      };
    };

    for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
      if ( cols.indexOf( allStickers[i].color ) < 0 ) {
        continue;
      }

      let u = allStickers[i].getOrientation();

      for (let j = 0, maxj = vecs.length; j < maxj; j += 1) {
        if ( vecs[j].sub( u ).abs() < EPS ) {
          stickers[j].push( allStickers[i] );
          break;
        }
      }
    }

    stickers[0].sort( getSort('z', 'x', -1, -1) );
    stickers[1].sort( getSort('y', 'z', 1, 1) );
    stickers[2].sort( getSort('y', 'x', 1, -1) );
    stickers[3].sort( getSort('z', 'x', 1, -1) );
    stickers[4].sort( getSort('y', 'z', 1, -1) );
    stickers[5].sort( getSort('y', 'x', 1, 1) );

    let sortedStickers = stickers.reduce((acc, e) => {
      return acc.concat(e);
    }, []);

    for (let i = 0, maxi = fColors.length; i < maxi; i += 1) {
      sortedStickers[i].color = cols[ colors.indexOf( fColors[i] ) ];
    }
  }

  adjustColors(topColor = '', bottomColor = '') {
    const typeFilter: PuzzleType[] = ['rubik', 'square1'];
    const modeFilter: CubeMode[] = [ CubeMode.NORMAL, CubeMode.CS, CubeMode.EO, CubeMode.CO ];

    if ( !typeFilter.some( e => e === this.type ) ) {
      return this;
    }

    if ( this.type === 'square1' && !modeFilter.some( m => m === this.mode ) ) {
      return this;
    }
    
    let pieces = this.p.pieces;
    
    if( this.mode === CubeMode.NORMAL || this.mode === CubeMode.ELL ||
      this.mode === CubeMode.ZBLL || this.mode === CubeMode.PLL ) {
      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let stickers = pieces[i].stickers;
        for (let j = 0, maxj = stickers.length; j < maxj; j += 1) {
          stickers[j].color = stickers[j].oColor;
        }
      }
      return this;
    }
    
    let TOP_COLOR = topColor || this.p.faceColors[3];
    let BOTTOM_COLOR = bottomColor || this.p.faceColors[ (this.p.faceColors.indexOf(TOP_COLOR) + 3) % 6 ];

    console.log("TOP_COLOR, BOTTOM_COLOR: ", TOP_COLOR, BOTTOM_COLOR, this.mode === CubeMode.CROSS);
    
    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let stickers = pieces[i].stickers.filter(s => 'xd'.indexOf(s.oColor) === -1 );
      let stLen = stickers.length;
      let topLayer = pieces[i].contains(TOP_COLOR);

      switch(this.mode) {
        case CubeMode.OLL: {
          for (let j = 0; j < stLen; j += 1) {
            if ( stickers[j].oColor != TOP_COLOR ) {
              stickers[j].color = 'x';
            } else {
              stickers[j].color = stickers[j].oColor;
            }
          }
          break;
        }
        case CubeMode.F2L: {
          for (let j = 0; j < stLen; j += 1) {
            if ( pieces[i].contains(TOP_COLOR) ) {
              stickers[j].color = 'x';
            } else {
              stickers[j].color = stickers[j].oColor;
            }
          }
          break;
        }
        case CubeMode.CMLL: {
          for (let j = 0; j < stLen; j += 1) {
            if ( topLayer && stLen === 2 ) {
              stickers[j].color = 'x';
            } else {
              stickers[j].color = stickers[j].oColor;
            }
          }
          break;
        }
        case CubeMode.OLLCP: {
          if ( topLayer ) {
            for (let j = 0; j < stLen; j += 1) {
              if ( stLen === 2 && stickers[j].oColor != TOP_COLOR ) {
                stickers[j].color = 'x';
              } else {
                stickers[j].color = stickers[j].oColor;
              }
            }
          } else {
            for (let j = 0; j < stLen; j += 1) {
              stickers[j].color = 'x';
            }
          }
          break;
        }
        case CubeMode.COLL: {
          if ( topLayer ) {
            for (let j = 0; j < stLen; j += 1) {
              if ( stLen === 2 ) {
                let isTop = true;
                let pts = stickers[j].points;
                for (let k = 1, maxk = pts.length; k < maxk; k += 1) {
                  if ( Math.abs(pts[k].y - pts[0].y) > 1e-5 ) {
                    isTop = false;
                    break;
                  }
                }

                if ( !isTop ) {
                  stickers[j].color = 'x';
                } else {
                  stickers[j].color = stickers[j].oColor;
                }
              } else {
                stickers[j].color = stickers[j].oColor;;
              }
            }
          } else {
            for (let j = 0; j < stLen; j += 1) {
              stickers[j].color = 'x';
            }
          }
          break;
        }
        case CubeMode.VLS:
        case CubeMode.WV: {
          for (let j = 0; j < stLen; j += 1) {
            if ( pieces[i].contains(TOP_COLOR) && stickers[j].oColor != TOP_COLOR ) {
              stickers[j].color = 'x';
            } else {
              stickers[j].color = stickers[j].oColor;
            }
          }
          break;
        }
        case CubeMode.GRAY: {
          for (let j = 0; j < stLen; j += 1) {
            stickers[j].color = 'x';
          }
          break;
        }
        case CubeMode.CENTERS: {
          for (let j = 0; j < stLen; j += 1) {
            if ( stLen != 1 ) {
              stickers[j].color = 'x';
            } else {
              stickers[j].color = stickers[j].oColor;
            }
          }
          break;
        }
        case CubeMode.CROSS: {
          let cnd = pieces[i].contains(BOTTOM_COLOR);
          for (let j = 0; j < stLen; j += 1) {
            stickers[j].color = cnd ? stickers[j].oColor : 'x';
          }
          break;
        }
        case CubeMode.FL: {
          let cnd = stLen >= 2 && !pieces[i].contains(BOTTOM_COLOR); 
          for (let j = 0; j < stLen; j += 1) {
            stickers[j].color = cnd ? 'x' : stickers[j].oColor;
          }
          break;
        }
        case CubeMode.YCROSS: {
          let cnd = pieces[i].contains(TOP_COLOR) && stLen > 2;
          for (let j = 0; j < stLen; j += 1) {
            stickers[j].color = cnd ? 'x' : stickers[j].oColor;
          }
          break;
        }
        case CubeMode.CS: {
          for (let i = 0; i < stLen; i += 1) {
            stickers[i].color = 'w';
          }
          break;
        }
        case CubeMode.EO: {
          for (let i = 0; i < stLen; i += 1) {
            let stref = stickers[i]._generator != stickers[i] ? stickers[i]._generator : stickers[i];
            let o = stref.getOrientation();

            if ( stref.points.length === 3 ) {
              if ( (stickers[i].oColor === TOP_COLOR && o.sub(UP).abs() < EPS) ||
                (stickers[i].oColor === BOTTOM_COLOR && o.sub(DOWN).abs() < EPS) ) {
                  stickers[i].color = 'k';
                } else {
                  stickers[i].color = 'w';
                }
            } else {
              stickers[i].color = 'w';
            }
          }
          break;
        }
        case CubeMode.CO: {
          for (let i = 0; i < stLen; i += 1) {
            let stref = stickers[i]._generator != stickers[i] ? stickers[i]._generator : stickers[i];
            
            if ( stickers[i].oColor === BOTTOM_COLOR && stref.points.length === 4 ) {
              stickers[i].color = 'k';
            } else {
              stickers[i].color = 'w';
            }
          }
          break;
        }
        default: {
          break;
        }
      }
    }

    return this;
  }

  static inverse(type: PuzzleType, sequence: string): string {
    let arr = sequence.trim().split(' ').map(e => e.trim()).filter(e => e != "");
    let res = [];

    if ( type === 'square1' ) {
      let sqre = /\s*\(?(-?\d+), *(-?\d+)\)?\s*/;
      
      arr = sequence.replace(/\s+/g, '').split('/');
      
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        let m = arr[i].match(sqre);
        if ( m ) {
          res.push(`(${-m[1]}, ${-m[2]})`);
        }
        if ( i > 0 ) {
          res.push('/');
        }
      }
    } else if ( type === 'megaminx' ) {
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        let mv = arr[i];

        if ( /^([RD](\+|-){2})$/.test(mv) ) {
          res.push(mv[0] + (mv[1] === '+' ? '-' : '+').repeat(2));
        } else {
          let turns1 = (parseInt(mv.replace(/\D*(\d+)\D*/g, '$1')) || 1) * Math.sign(mv.indexOf("'") + 0.2);
          let turns = (5 - ((parseInt(mv.replace(/\D*(\d+)\D*/g, '$1')) || 1) * Math.sign(mv.indexOf("'") + 0.2)) % 5) % 5;

          if ( /^([URFL]\d*'?)$/.test(mv) ) {
            res.push(`${mv[0]}${turns === 1 || turns === -1 ? '' : Math.abs(turns)}${turns < 0 ? '' : "'"}`);
          } else if ( /^([db][RL]\d*'?)$/.test(mv) ) {
            res.push(`${mv.slice(0, 2)}${turns === 1 || turns === -1 ? '' : Math.abs(turns)}${turns < 0 ? '' : "'"}`);
          } else {
            res.push(`[${mv[1]}${turns === 1 || turns === -1 ? '' : Math.abs(turns)}${turns < 0 ? '' : "'"}]`);
          }
        }
      }
    } else {
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        if ( arr[i].indexOf('2') > -1 ) {
          res.push( arr[i].replace("'", "") );
        } else if ( arr[i].indexOf("'") > -1 ) {
          res.push( arr[i].replace("'", "") );
        } else {
          res.push( arr[i] + "'" );
        }
      }
    }

    return res.join(" ");
  }

  static fromSequence(scramble: string, options: PuzzleOptions, inv = false, move = true): Puzzle {
    let p = new Puzzle(options);
    let s = (inv) ? Puzzle.inverse(options.type, scramble) : scramble;
    p.options.sequence = s;
    try { move && p.move(s) } catch {}
    return p;
  }

  static fromFacelet(facelet: string, type: PuzzleType): Puzzle {
    if ( !/^[UDLRFB]+$/.test(facelet) || facelet.length % 6 != 0 ) {
      return Puzzle.fromSequence('', { type: 'rubik' });
    }

    let order = ~~Math.sqrt( facelet.length / 6);

    if ( order === 3 ) {
      let sol: string = solvFacelet(facelet);
      if ( !sol.startsWith("Error") ) {
        return Puzzle.fromSequence(sol, { type, order: [3, 3, 3], view: 'trans' }, true, true);
      }
    }

    return new Puzzle({
      type,
      order: [ order, order, order ],
      view: 'trans',
      facelet
    });
  }

  toFacelet(): string {
    if ( !(this.type === 'rubik' || this.type === 'icarry') ) return '';

    let colors = "URFDLB";
    let vecs = this.p.faceVectors;
    let cols = this.p.faceColors;
    let allStickers = this.p.getAllStickers().filter(st => !(st instanceof ImageSticker));
    let stickers: Sticker[][] = vecs.map(_ => []);
    let getSort = (k1: keyof Vector3D, k2: keyof Vector3D, d1: number, d2: number) => {
      return (s1: Sticker, s2: Sticker) => {
        let m1: any = s1.getMassCenter();
        let m2: any = s2.getMassCenter();

        if ( Math.abs(m1[k1] - m2[k1]) > EPS ) {
          return m1[k1] < m2[k1] ? d1 : -d1;
        }
        return m1[k2] < m2[k2] ? d2 : -d2;
      };
    };

    for (let i = 0, maxi = allStickers.length; i < maxi; i += 1) {
      if ( cols.indexOf( allStickers[i].color ) < 0 ) {
        continue;
      }

      let u = allStickers[i].getOrientation();

      for (let j = 0, maxj = vecs.length; j < maxj; j += 1) {
        if ( vecs[j].sub( u ).abs() < EPS ) {
          stickers[j].push( allStickers[i] );
          break;
        }
      }
    }

    stickers[0].sort( getSort('z', 'x', -1, -1) );
    stickers[1].sort( getSort('y', 'z', 1, 1) );
    stickers[2].sort( getSort('y', 'x', 1, -1) );
    stickers[3].sort( getSort('z', 'x', 1, -1) );
    stickers[4].sort( getSort('y', 'z', 1, -1) );
    stickers[5].sort( getSort('y', 'x', 1, 1) );

    let sortedStickers = stickers.reduce((acc, e) => {
      return acc.concat(e);
    }, []);

    let res = [];

    for (let i = 0, maxi = sortedStickers.length; i < maxi; i += 1) {
      let st = sortedStickers[i];

      for (let j = 0, maxj = cols.length; j < maxj; j += 1) {
        if ( st.color === cols[j] ) {
          res.push(colors[j]);
          break;
        }
      }
    }

    return res.join("");
  }

  setTips(tips: number[]) {
    this.arrows = tips.map(e => e);
  }

  isComplete(): boolean {
    let pieces = this.p.pieces;
    let fv = this.p.faceVectors;
    let fvLen = fv.length;
    let colors = [];

    for (let i = 0; i < fvLen; i += 1) {
      colors.push('-');
    }

    for (let p = 0, maxp = pieces.length; p < maxp; p += 1) {
      let stickers = pieces[p].stickers;

      for (let s = 0, maxs = stickers.length; s < maxs; s += 1) {
        if ( "xd".indexOf(stickers[s].oColor) > -1 ) {
          continue;
        }

        let v = stickers[s].getOrientation();
        let ok = false;

        for (let j = 0; j < fvLen; j += 1) {
          if ( v.sub( fv[j] ).abs() < EPS ) {
            if ( colors[j] === '-' ) {
              colors[j] = stickers[s].oColor;
            } else if ( colors[j] != stickers[s].oColor ) {
              return false;
            }

            ok = true;
            break;
          }
        }

        if ( !ok ) {
          return false;
        }
      }
    }

    return true;
  }

  move(seq: string) {
    let moves: any[]; 

    if ( ['rubik', 'axis', 'fisher' ].indexOf(this.type) > -1 ) {
      moves = ScrambleParser.parseNNN(seq, this.order[0]);
    } else if ( this.type === 'pyraminx' ) {
      moves = ScrambleParser.parsePyraminx(seq);
    } else if ( this.type === 'skewb' ) {
      moves = ScrambleParser.parseSkewb(seq);
    } else if ( this.type === 'square1' || this.type === 'square2' ) {
      moves = ScrambleParser.parseSquare1(seq);
    } else if ( this.type === 'clock' ) {
      moves = ScrambleParser.parseClock(seq);
    } else if ( this.type === 'megaminx' || this.type === 'pyraminxCrystal' ) {
      moves = ScrambleParser.parseMegaminx(seq);
    } else if ( this.type === 'bicube' || this.type === 'gear' || this.type === 'redi' || this.type === 'ivy' ||
      this.type === 'helicopter'
     ) {
      moves = [seq];
    } else if ( this.type === 'supersquare1' ) {
      moves = ScrambleParser.parseSuperSquare1(seq);
    } else {
      return this;
    }

    this.p.move(moves);
    this.adjustColors();
    return this;
  }

  getColor(face: string): string {
    return this.p.palette[ face ];
  }

  getHexColor(face: string): number {
    let col = new Color( this.p.palette[ face ] );
    return strToHex( col.toRGBStr() );
  }

  getHexStrColor(face: string): string {
    return new Color(this.p.palette[ face ]).toHex();
  }

  get pieces(): Piece[] {
    return this.p.pieces;
  }

  getAllStickers() {
    return this.p.getAllStickers();
  }

  clone(newMode?: CubeMode): Puzzle {
    let res = new Puzzle({
      type: this.type,
      mode: typeof newMode != 'undefined' ? newMode : this.mode,
      view: this.view,
      order: [this.order[0]],
      tips: this.arrows,
      headless: this.options.headless,
      rounded: this.options.rounded,
      sequence: this.options.sequence
    });

    res.p.pieces.length = 0;

    let pieces = this.p.pieces;

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      res.p.pieces.push( pieces[i].clone() );
    }
    res.p.center = this.p.center.clone();
    res.p.dims = (this.p.dims || []).map(e => e);
    res.p.rotation = Object.assign({}, this.p.rotation);
    res.rotation = Object.assign({}, this.rotation);

    return res;
  }

  moveFromMouse(pc: Piece, st: Sticker, pt: any, v: any) {
    return this.p.toMove ? this.p.toMove(pc, st, pt, v) : [];
  }

  getPiece(v: Vector3D[]): [Piece, Sticker] {
    let pc = this.pieces;
    let d = Infinity;
    let rp: Piece;
    let rs: Sticker;
    
    for (let i = 0, maxi = pc.length; i < maxi; i += 1) {
      let st = pc[i].stickers;
      for (let j = 0, maxj = st.length; j < maxj; j += 1) {
        let pts = st[j].points;
        if ( v.length === pts.length ) {
          let sum = pts.reduce((ac, e, idx) => 
            ac + e.sub(new Vector3D(v[idx].x, v[idx].y, v[idx].z)).abs(), 0);

          if ( sum < d ) {
            d = sum;
            rp = pc[i];
            rs = st[j];
          }
        }
      }
    }

    // @ts-ignore
    return [rp, rs];

  }

  computeBoundingBox(): Vector3D[] {
    let bbs = this.pieces.map(s => s.computeBoundingBox());
    let box = bbs.reduce((ac, p) => {
      return [
        Math.min(ac[0], p[0].x), Math.min(ac[1], p[0].y), Math.min(ac[2], p[0].z),
        Math.max(ac[3], p[1].x), Math.max(ac[4], p[1].y), Math.max(ac[5], p[1].z),
      ]
    }, [ Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity ]);

    return [
      new Vector3D(box[0], box[1], box[2]),
      new Vector3D(box[3], box[4], box[5])
    ];
  }

}
