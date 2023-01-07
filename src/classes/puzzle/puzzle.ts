import { UP, Vector3D } from './../vector3d';
import type { Sticker } from './Sticker';
import { Color } from './../Color';
import { ScrambleParser } from './../scramble-parser';
import { CubeMode, PX_IMAGE, strToHex } from '@constants';
import type { Piece } from './Piece';
import type { PuzzleInterface, PuzzleOptions, PuzzleType, CubeView } from '@interfaces';
import * as puzzles from './allPuzzles';
import { puzzleReg } from './puzzleRegister';

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
    this.img = PX_IMAGE;

    this.options.sequence = '';

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

    this.p = puzzleReg.get(this.type).constr.apply(null, a);

    this.order = a;
    this.rotation = this.p.rotation;

    this.adjustColors();

  }

  private adjustColors() {

    if ( this.type != 'rubik' ) {
      return;
    }
    
    let pieces = this.p.pieces;
    let topCenter: Sticker;

    if( this.mode === CubeMode.NORMAL || this.mode === CubeMode.ELL ||
      this.mode === CubeMode.ZBLL || this.mode === CubeMode.PLL ) {
      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let stickers = pieces[i].stickers;
        for (let j = 0, maxj = stickers.length; j < maxj; j += 1) {
          stickers[j].color = stickers[j].oColor;
        }
      }
      return;
    }

    if ( this.order[0] === 1 ) {
      topCenter = pieces[0].stickers.filter(s => s.getOrientation().sub(UP).abs() < 1e-6)[0];
    } else if ( this.order[0] === 2 ) {
      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        if ( pieces[i].getMassCenter(false).y > 0 ) {
          topCenter = pieces[i].stickers.filter(s => s.getOrientation().sub(UP).abs() < 1e-6)[0];
          break;
        }
      }
    } else if ( this.order[0] % 2 == 1 ) {
      topCenter = pieces.filter(p => {
        let st = p.stickers.filter(s => s.oColor != 'x' && s.oColor != 'd');
        let len = st.length;
        if ( len != 1 ) return false;
        let cm = st[0].getMassCenter();
        return st[0].getOrientation().sub(UP).abs() < 1e-6 &&
          Math.abs(cm.x) < 1e-6 && Math.abs(cm.z) < 1e-6;
      })[0].stickers.filter(s => s.oColor != 'x' && s.oColor != 'd')[0];
    } else {
      topCenter = pieces.filter(
        p => p.length === 2 && p.stickers[0].getOrientation().sub(UP).abs() < 1e-6

        )[0].stickers[0];
    }

    let TOP_COLOR = topCenter.oColor;
    let BOTTOM_COLOR = this.p.faceColors[ (this.p.faceColors.indexOf(TOP_COLOR) + 3) % 6 ];
    
    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let stickers = pieces[i].stickers.filter(s => 'xd'.indexOf(s.oColor) === -1 );
      let stLen = stickers.length;
      let topLayer = stickers.reduce((ac, s) => ac || s.getOrientation().sub(UP).abs() < 1e-6, false);
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
          let cnd = stLen > 2 || (stLen === 2 && !pieces[i].contains(BOTTOM_COLOR));
          for (let j = 0; j < stLen; j += 1) {
            stickers[j].color = cnd ? 'x' : stickers[j].oColor;
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
        default: {
          break;
        }
      }
    }
  }

  static inverse(type: PuzzleType, sequence: string): string {
    let arr = sequence.trim().split(' ').map(e => e.trim()).filter(e => e != "");
    let res = [];

    if ( type !== 'square1' ) {
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        if ( arr[i].indexOf('2') > -1 ) {
          res.push( arr[i].replace("'", "") );
        } else if ( arr[i].indexOf("'") > -1 ) {
          res.push( arr[i].replace("'", "") );
        } else {
          res.push( arr[i] + "'" );
        }
      }
    } else {
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
    }

    return res.join(" ");
  }

  static fromSequence(scramble: string, options: PuzzleOptions, inv ?: boolean): Puzzle {
    let p = new Puzzle(options);
    let s = (inv) ? Puzzle.inverse(options.type, scramble) : scramble;
    p.move(s);
    p.options.sequence = s;
    return p;
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
          if ( v.sub( fv[j] ).abs() < 1e-6 ) {
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

  move(seq: string): void {
    let moves: any[]; 

    if ( ['rubik', 'axis', 'fisher', 'ivy'].indexOf(this.type) > -1 ) {
      moves = ScrambleParser.parseNNN(seq, this.order[0]);
    } else if ( this.type === 'pyraminx' ) {
      moves = ScrambleParser.parsePyraminx(seq);
    } else if ( this.type === 'skewb' ) {
      moves = ScrambleParser.parseSkewb(seq);
    } else if ( this.type === 'square1' ) {
      moves = ScrambleParser.parseSquare1(seq);
    } else if ( this.type === 'clock' ) {
      moves = ScrambleParser.parseClock(seq);
    } else if ( this.type === 'megaminx' ) {
      moves = ScrambleParser.parseMegaminx(seq);
    } else {
      return;
    }

    this.p.move(moves);
    this.adjustColors();

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
      tips: this.arrows
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

  moveFromMouse(pc: Piece, st: Sticker, pt, v) {
    return this.p.toMove(pc, st, pt, v);
  }

  getPiece(v): [Piece, Sticker] {
    let pc = this.pieces;
    let d = Infinity;
    let rp = null;
    let rs = null;
    
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
