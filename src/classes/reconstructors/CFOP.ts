import type { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import { Puzzle } from "@classes/puzzle/puzzle";
import { ScrambleParser } from "@classes/scramble-parser";
import { BACK, DOWN, FRONT, LEFT, RIGHT, UP, type Vector3D } from "@classes/vector3d";
import { CubeMode, EPS, STANDARD_PALETTE } from "@constants";
import { solvFacelet } from "@cstimer/scramble/scramble_333";
import { calcPercents, sum } from "@helpers/math";
import type { Algorithm, ReconstructorStep } from "@interfaces";
import { DataService } from "@stores/data.service";

interface CrossResult {
  vec: Vector3D;
  color: string;
}

interface F2LResult {
  total: number;
  pairs: {
    cross: CrossResult;
    pairs: Piece[][];
  }[]
}

export enum Stage {
  SCRAMBLED = 0,
  CROSS = 1,
  F2L_PAIR1 = 2,
  F2L_PAIR2 = 3,
  F2L_PAIR3 = 4,
  F2L_PAIR4 = 5,
  OLL = 6,
  PLL = 7,
  AUF = 8,
  COMPLETED = 9,
}

const StageStr = {
  0: 'SCRAMBLED',
  1: 'CROSS',
  2: 'F2L_PAIR1',
  3: 'F2L_PAIR2',
  4: 'F2L_PAIR3',
  5: 'F2L_PAIR4',
  6: 'OLL',
  7: 'PLL',
  8: 'AUF',
  9: 'COMPLETED',
}

interface CFOPStatus {
  cross: CrossResult[];
  f2l: F2LResult;
  oll: boolean;
  pll: boolean;
  auf: boolean;
  completed: boolean;
  stage: Stage;
  facelet: string;
}

interface CFOPTimeline {
  status: CFOPStatus;
  moves: { move: string, time: number }[];
  time: number;
}

interface LLAlgorithm {
  alg: Algorithm;
  facelets: number[][];
}


function centerStickerAligned(center: Piece, st: Sticker, ignoreColor = false): boolean {
  if (/^[xd]$/.test(st.color)) return false;

  let centerSticker = center.stickers.filter(cst => /^[^xd]$/.test(cst.color))[0];
  let o = centerSticker.getOrientation();

  return (ignoreColor ? true : st.color === centerSticker.color) && st.getOrientation().sub(o).abs() < EPS;
}

function pieceInPlace(centers: Piece[], piece: Piece): boolean {
  let edgeStickers = piece.stickers.filter(st => /^[^xd]$/.test(st.color));
  return edgeStickers.every(st => centers.some(c => centerStickerAligned(c, st)));
}

function pieceInCenter(center: Piece, piece: Piece): boolean {
  let edgeStickers = piece.stickers.filter(st => /^[^xd]$/.test(st.color));
  return edgeStickers.some(st => centerStickerAligned(center, st, true));
}

function calcMoves(moves: string[]): number {
  return moves.length;
}

type TEquivalentMode = "OLL" | "PLL";

function equivalentFacelets(f1: number[], f2: number[], type: TEquivalentMode): boolean {
  let fMap: Map<number, number> = new Map();
  let template = "UUUUUUUUURRR------FFF---------------LLL------BBB------".split('').map(s => s != "-");
  let filter = (s: number) => type === "PLL" ? true : s === f1[4]; // 85 = U in ASCII representation

  for (let i = 0, maxi = f1.length; i < maxi; i += 1) {
    if ( !template[i] || !filter(f1[i]) ) continue;

    if ( !fMap.has(f1[i]) ) {
      fMap.set(f1[i], f2[i]);
    }

    if ( fMap.get(f1[i]) != f2[i] ) return false;
  }

  return true;
}

export class CFOP {
  facelet: string;

  cube: Puzzle;
  private centers: Piece[];
  private edges: Piece[];
  private corners: Piece[];
  private stage: Stage;
  private status: CFOPTimeline[];
  private OLLAlgs: LLAlgorithm[];
  private PLLAlgs: LLAlgorithm[];
  private lastTime: number;
  private currTime: number;
  private moves: CFOPTimeline['moves'];
  
  constructor(facelet?: string) {
    this.facelet = '';
    this.cube = new Puzzle({ type: 'rubik' });
    this.centers = [];
    this.edges = [];
    this.corners = [];
    this.stage = Stage.COMPLETED;
    this.status = [];
    this.OLLAlgs = [];
    this.PLLAlgs = [];
    this.lastTime = 0;
    this.currTime = 0;
    this.moves = [];

    this.getAlgs();
    this.setFacelet(facelet || '');
  }

  async getAlgs() {
    if (this.OLLAlgs.length && this.PLLAlgs.length) return;

    let dataService = DataService.getInstance();

    this.OLLAlgs = (await dataService.getAlgorithms('333/oll')).map(a => {
      let facelets = ["", "U", "U2", "U'"].map(mv => Puzzle.fromSequence(
        mv + " " + a.scramble, {type: 'rubik'}, true).toFacelet().split("").map(s => s.charCodeAt(0))
      );

      return { alg: a, facelets }
    });

    this.PLLAlgs = (await dataService.getAlgorithms('333/pll')).map(a => {
      let facelets = ["", "U", "U2", "U'"].map(mv => Puzzle.fromSequence(
        mv + " " + a.scramble, {type: 'rubik'}, true).toFacelet().split("").map(s => s.charCodeAt(0))
      );

      return { alg: a, facelets }
    });
  }

  setFacelet(facelet: string) {
    this.facelet = facelet;
    this.cube = Puzzle.fromFacelet(facelet, 'rubik');
    this.centers = [];
    this.edges = [];
    this.corners = [];
    this.lastTime = -1;
    this.currTime = 0;
    this.moves = [];

    let pieces = this.cube.p.pieces;

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let colorst = pieces[i].stickers.filter(st => /^[^xd]$/.test(st.color)).length;

      if (colorst === 1) {
        this.centers.push(pieces[i]);
      } else if (colorst === 2) {
        this.edges.push(pieces[i]);
      } else {
        this.corners.push(pieces[i]);
      }
    }

    this.status = [{ status: this.getStatus(), moves: [], time: 0 }];
  }

  setSequence(scramble: string) {
    this.setFacelet(Puzzle.fromSequence(scramble, { type: 'rubik', order: [3, 3, 3] }).toFacelet());
  }

  toFacelet(): string {
    return this.cube.toFacelet();
  }

  private cross(): CrossResult[] {
    let centers = this.centers;
    let edges = this.edges;
    let vecs = centers.map(c => c.stickers[0].getOrientation());
    let cols = centers.map(c => c.stickers[0].color);

    let group = centers.map(c => {
      return edges.filter(edge => edge.stickers.some(st => centerStickerAligned(c, st)));
    });

    return group.reduce((acc: any, e, p) => {
      if (e.length != 4) return acc;

      if (e.every((pc) => pieceInPlace(centers, pc))) {
        return [...acc, { vec: vecs[p], color: cols[p] }];
      }
      return acc;
    }, []);
  }

  private f2l(cross: CrossResult[]): F2LResult {
    let centers = this.centers;
    let edges = this.edges;
    let corners = this.corners.filter(c => pieceInPlace(centers, c));
    let pairs = corners.reduce((acc, corner) => {
      let fEdges = edges.filter(
        edge => edge.stickers.every(
          st => /^[xd]$/.test(st.color) ? true : corner.stickers.some(cst => cst.color === st.color)
        )
      );

      fEdges.forEach(edge => {
        if (pieceInPlace(centers, edge)) {
          acc.push([corner, edge]);
        }
      })

      return acc;
    }, [] as Piece[][]);

    let pairRes: F2LResult['pairs'] = [];

    for (let i = 0, maxi = cross.length; i < maxi; i += 1) {
      let cr = cross[i];
      let cPairs = pairs.filter(
        p => p[0].stickers.some(st => st.color === cr.color) && p[1].stickers.every(st => st.color != cr.color)
      );

      if (cPairs.length) {
        pairRes.push({ cross: cr, pairs: cPairs });
      }
    }

    return {
      total: pairRes.length,
      pairs: pairRes
    }
  }

  private oll(f2l: F2LResult): boolean {
    let results = f2l.pairs.filter(p => p.pairs.length === 4);

    if (results.length === 0) return false;

    let { cross } = results[0];
    let topCenter = this.centers.filter(ct => ct.stickers[0].getOrientation().add(cross.vec).abs() < EPS)[0];
    let pieces = this.cube.pieces.filter(pc => pieceInCenter(topCenter, pc));

    return pieces.every(pc => pc.stickers.some(st => centerStickerAligned(topCenter, st)));
  }

  private pll(f2l: F2LResult): boolean {
    let results = f2l.pairs.filter(p => p.pairs.length === 4);

    if (results.length === 0) return false;

    let { cross } = results[0];
    let topCenter = this.centers.filter(ct => ct.stickers[0].getOrientation().add(cross.vec).abs() < EPS)[0];
    let pieces = this.cube.pieces.filter(pc => pieceInCenter(topCenter, pc));
    let vecs = this.cube.p.faceVectors;
    let cols = vecs.map(_ => "");

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let st = pieces[i].stickers;

      for (let j = 0, maxj = st.length; j < maxj; j += 1) {
        if (st[j].color === 'x' || st[j].color === 'd') continue;
        let u = st[j].getOrientation();

        for (let k = 0, maxk = vecs.length; k < maxk; k += 1) {
          if (vecs[k].sub(u).abs() < EPS) {
            if (!cols[k]) {
              cols[k] = st[j].color;
            } else if (cols[k] != st[j].color) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  completed(): boolean {
    let centers = this.centers;
    return this.cube.pieces.every(pc => pieceInPlace(centers, pc));
  }

  getStatus(): CFOPStatus {
    // console.time('CFOP');
    let cross = this.cross();
    let f2l = this.f2l(cross);
    let oll = this.oll(f2l);
    let pll = this.pll(f2l);
    let completed = this.completed();
    let auf = pll && !completed;
    // console.timeEnd('CFOP');

    if (cross.length === 0) {
      this.stage = Stage.SCRAMBLED;
    } else if (f2l.total === 0) {
      this.stage = Stage.CROSS;
    } else if (!oll) {
      this.stage = [
        Stage.F2L_PAIR1,
        Stage.F2L_PAIR2,
        Stage.F2L_PAIR3,
        Stage.F2L_PAIR4,
      ][f2l.pairs.reduce((acc, e) => Math.max(acc, e.pairs.length), 0) - 1];
    } else if (!pll) {
      this.stage = Stage.OLL;
    } else if (!auf && !completed) {
      this.stage = Stage.PLL;
    } else if (completed) {
      // this.stage = completed ? Stage.COMPLETED : Stage.AUF;
      this.stage = Stage.COMPLETED;
    }

    return { cross, f2l, oll, pll, auf, completed, stage: this.stage, facelet: this.toFacelet() }
  }

  feed(seq: CFOPTimeline['moves'][number]) {
    if ( this.lastTime < 0 ) {
      this.lastTime = seq.time - 50; // Adjustment of the first move
    }

    this.currTime = seq.time;
    this.cube.move(seq.move);
    let st = this.getStatus();
    let lastStage = this.status[this.status.length - 1];
    lastStage.moves.push({ move: seq.move, time: this.currTime });
    lastStage.time = this.currTime - this.lastTime;

    if (st.stage > lastStage.status.stage) {
      this.status.push({ status: st, moves: [], time: 0 });
      this.lastTime = this.currTime;
    }
  }

  addMove(move: string) {
    this.moves.push({ move, time: performance.now() });
  }

  getTimeline() {
    return this.status;
  }

  async detectOLL(status: CFOPStatus): Promise<Algorithm | null> {
    await this.getAlgs();

    let bottomLayer = status.f2l.pairs.filter(p => p.pairs.length === 4)[0].cross.vec;
    let algs = this.OLLAlgs;
    let cube = Puzzle.fromFacelet(status.facelet, 'rubik');

    let faceTransform: any[] = [ // Transformation according to the cross face
      [UP, 'z2'], [RIGHT, 'z'], [FRONT, "x'"],
      [DOWN, ''], [LEFT, "z'"], [BACK, 'x'],
    ];

    for (let i = 0, maxi = faceTransform.length; i < maxi; i += 1) {
      let tr = faceTransform[i];

      if (tr[0].sub(bottomLayer).abs() < EPS) {
        cube.move(tr[1]);
        break;
      }
    }

    let _facelet = cube.toFacelet();
    let facelet = _facelet.split("").map(s => s.charCodeAt(0));

    for (let a = 0, maxa = algs.length; a < maxa; a += 1) {
      let { alg, facelets } = algs[a];

      for (let i = 0, maxi = facelets.length; i < maxi; i += 1) {
        if ( equivalentFacelets(facelet, facelets[i], "OLL") ) {
          return alg;
        }
      }
    }

    return null;
  }

  async detectPLL(status: CFOPStatus): Promise<Algorithm | null> {
    await this.getAlgs();

    let bottomLayer = status.f2l.pairs.filter(p => p.pairs.length === 4)[0].cross.vec;
    let algs = this.PLLAlgs;
    let cube = Puzzle.fromFacelet(status.facelet, 'rubik');

    let faceTransform: any[] = [ // Transformation according to the cross face
      [UP, 'z2'], [RIGHT, 'z'], [FRONT, "x'"],
      [DOWN, ''], [LEFT, "z'"], [BACK, 'x'],
    ];

    for (let i = 0, maxi = faceTransform.length; i < maxi; i += 1) {
      let tr = faceTransform[i];

      if (tr[0].sub(bottomLayer).abs() < EPS) {
        cube.move(tr[1]);
        break;
      }
    }

    let _facelet = cube.toFacelet();
    let facelet = _facelet.split("").map(s => s.charCodeAt(0));

    for (let a = 0, maxa = algs.length; a < maxa; a += 1) {
      let { alg, facelets } = algs[a];

      for (let i = 0, maxi = facelets.length; i < maxi; i += 1) {
        if ( equivalentFacelets(facelet, facelets[i], "PLL") ) {
          return alg;
        }
      }
    }

    return null;
  }

  async getAnalysis(totalTime: number): Promise<ReconstructorStep[]> {
    if ( this.moves.length ) {
      this.moves.forEach(mv => this.feed(mv));
      this.moves.length = 0;
    }

    let timeline = this.getTimeline();
    let steps = [
      [Stage.SCRAMBLED], // CROSS
      [Stage.CROSS, Stage.F2L_PAIR1, Stage.F2L_PAIR2, Stage.F2L_PAIR3], // F2L
      [Stage.F2L_PAIR4], // OLL
      [Stage.OLL, Stage.PLL, Stage.AUF, Stage.COMPLETED], // PLL
    ];

    let moves = steps.map(subs => subs.map(_ => 0));
    let time = steps.map(subs => subs.map(_ => 0));
    let st = timeline[0].status;
    let cross: Algorithm | null = null;
    let f2l: Algorithm | null = null;
    let oll: Algorithm | null = null;
    let pll: Algorithm | null = null;

    for (let s = 0, maxs = steps.length, i = 0; s < maxs && i < timeline.length; s += 1) {
      let substep = steps[s];

      for (let j = 0, maxj = substep.length; j < maxj && i < timeline.length; j += 1) {
        if (st.stage === substep[j]) {
          if (st.f2l.pairs.some(p => p.pairs.length === 4) && !st.oll) {
            oll = await this.detectOLL(st);
          }
          
          if (st.oll && !st.pll) {
            pll = await this.detectPLL(st);
          }

          time[s][j] = timeline[i].time;
          moves[s][j] = timeline[i].moves.length;

          i += 1;
          i < timeline.length && (st = timeline[i].status);
        }

        if ( !cross && st.stage >= Stage.F2L_PAIR4 ) {
          let vec = st.f2l.pairs[0].cross.vec;
          let vecs = [UP, RIGHT, FRONT, DOWN, LEFT, BACK];
          let trans = ["x'", "y", "", "x", "y'", "y2"];
          let cube = Puzzle.fromFacelet(st.facelet, 'rubik');
          
          for (let i = 0; i < 6; i += 1) {
            if ( vec.sub(vecs[i]).abs() < EPS ) {
              cube.move(trans[i]);
              break;
            }
          }

          cross = {
            name: '',
            shortName: '',
            order: 3,
            mode: CubeMode.CROSS,
            ready: true,
            scramble: solvFacelet(cube.toFacelet())
          };
        }
      }
    }

    let moveSum = sum(time.map(sum));
    let factor = totalTime / moveSum;

    for (let i = 0, maxi = time.length; i < maxi; i += 1) {
      for (let j = 0, maxj = time[i].length; j < maxj; j += 1) {
        time[i][j] *= factor;
      }
    }

    let percents = calcPercents(time.map(sum), totalTime);
    let f2lPercents = calcPercents(time[1], sum(time[1]));
    let f2ls = time[1].map((t, p): ReconstructorStep => ({
      time: t,
      name: "F2L pair " + (p + 1),
      moves: moves[1][p],
      case: null,
      percent: f2lPercents[p],
      skip: !t,
      substeps: []
    }));

    return [
      { name: "Cross", moves: moves[0][0], case: cross, percent: percents[0], skip: false, substeps: [], time: time[0][0] },
      { name: "F2L", moves: sum(moves[1]), case: null, percent: percents[1], skip: false, substeps: f2ls, time: sum(time[1]) },
      { name: "OLL", moves: moves[2][0], case: oll, percent: percents[2], skip: false, substeps: [], time: time[2][0] },
      { name: "PLL", moves: sum(moves[3]), case: pll, percent: percents[3], skip: false, substeps: [], time: sum(time[3]) },
    ];
  }
}