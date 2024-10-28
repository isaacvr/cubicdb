import type { Piece } from "@classes/puzzle/Piece";
import { Puzzle } from "@classes/puzzle/puzzle";
import { BACK, DOWN, FRONT, LEFT, RIGHT, UP, type Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import { calcPercents, sum } from "@helpers/math";
import type { Algorithm } from "@interfaces";
import { DataService } from "@stores/data.service";
import type { IReconstructor, ReconstructorMethod, ReconstructorStep } from "./interfaces";
import { centerStickerAligned, getColoredStickers, pieceInCenter, pieceInPlace } from "./utils";
import { formatMoves } from "@helpers/strings";
import { dataService } from "$lib/data-services/data.service";
import { get } from "svelte/store";

interface CrossResult {
  vec: Vector3D;
  color: string;
}

interface F2LResult {
  total: number;
  pairs: {
    cross: CrossResult;
    pairs: Piece[][];
  }[];
}

interface OLLResult {
  topCenter: Piece;
  f2l: F2LResult["pairs"][number];
}

interface PLLResult {
  oll: OLLResult;
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

interface CFOPStatus {
  cross: CrossResult[];
  f2l: F2LResult | null;
  oll: OLLResult[] | null;
  pll: PLLResult[] | null;
  auf: boolean;
  completed: boolean;
  stage: Stage;
  facelet: string;
}

interface CFOPTimeline {
  status: CFOPStatus;
  moves: { move: string; time: number }[];
  time: number;
}

interface LLAlgorithm {
  alg: Algorithm;
  facelets: number[][];
}

type TEquivalentMode = "OLL" | "PLL";

function equivalentFacelets(f1: number[], f2: number[], type: TEquivalentMode): boolean {
  let fMap: Map<number, number> = new Map();
  let template = "UUUUUUUUURRR------FFF---------------LLL------BBB------"
    .split("")
    .map(s => s != "-");
  let filter = (s: number) => (type === "PLL" ? true : s === f1[4]); // 85 = U in ASCII representation

  for (let i = 0, maxi = f1.length; i < maxi; i += 1) {
    if (!template[i] || !filter(f1[i])) continue;

    if (!fMap.has(f1[i])) {
      fMap.set(f1[i], f2[i]);
    }

    if (fMap.get(f1[i]) != f2[i]) return false;
  }

  return true;
}

export class CFOP implements IReconstructor {
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
  private moves: CFOPTimeline["moves"];

  constructor(facelet?: string) {
    this.facelet = "";
    this.cube = new Puzzle({ type: "rubik" });
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
    this.setFacelet(facelet || "");
  }

  async getAlgs() {
    if (this.OLLAlgs.length && this.PLLAlgs.length) return;

    this.OLLAlgs = (await get(dataService).algorithms.getAlgorithms({ path: "333/oll" })).map(a => {
      let facelets = ["", "U", "U2", "U'"].map(mv =>
        Puzzle.fromSequence(mv + " " + a.scramble, { type: "rubik" }, true)
          .toFacelet()
          .split("")
          .map(s => s.charCodeAt(0))
      );

      return { alg: a, facelets };
    });

    this.PLLAlgs = (await get(dataService).algorithms.getAlgorithms({ path: "333/pll" })).map(a => {
      let facelets = ["", "U", "U2", "U'"].map(mv =>
        Puzzle.fromSequence(mv + " " + a.scramble, { type: "rubik" }, true)
          .toFacelet()
          .split("")
          .map(s => s.charCodeAt(0))
      );

      return { alg: a, facelets };
    });
  }

  setFacelet(facelet: string) {
    this.facelet = facelet;
    this.cube = Puzzle.fromFacelet(facelet, "rubik");
    this.centers = [];
    this.edges = [];
    this.corners = [];
    this.lastTime = -1;
    this.currTime = 0;
    this.moves = [];

    let pieces = this.cube.p.pieces;

    for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
      let colorst = getColoredStickers(pieces[i]).length;

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
    this.setFacelet(Puzzle.fromSequence(scramble, { type: "rubik", order: [3, 3, 3] }).toFacelet());
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

      if (e.every(pc => pieceInPlace(centers, pc))) {
        return [...acc, { vec: vecs[p], color: cols[p] }];
      }
      return acc;
    }, []);
  }

  private f2l(cross: CrossResult[]): F2LResult | null {
    if (cross.length === 0) return null;

    let centers = this.centers;
    let edges = this.edges;
    let corners = this.corners.filter(c => pieceInPlace(centers, c));
    let pairs = corners.reduce((acc, corner) => {
      let fEdges = edges.filter(edge => {
        let cols = getColoredStickers(edge).map(st => st.color);
        return cols.every(c => corner.contains(c));
      });

      fEdges.forEach(edge => pieceInPlace(centers, edge) && acc.push([corner, edge]));

      return acc;
    }, [] as Piece[][]);

    let pairRes: F2LResult["pairs"] = [];

    for (let i = 0, maxi = cross.length; i < maxi; i += 1) {
      let cr = cross[i];
      let cPairs = pairs.filter(p => p[0].contains(cr.color) && !p[1].contains(cr.color));

      if (cPairs.length) {
        pairRes.push({ cross: cr, pairs: cPairs });
      }
    }

    return pairRes.length === 0
      ? null
      : {
          total: pairRes.length,
          pairs: pairRes,
        };
  }

  private oll(f2l: F2LResult | null): OLLResult[] | null {
    if (!f2l || f2l.total === 0) return null;

    let results = f2l.pairs.filter(p => p.pairs.length === 4);

    if (results.length === 0) return null;

    let res: OLLResult[] = [];

    for (let i = 0, maxi = results.length; i < maxi; i += 1) {
      let { cross } = results[i];
      let topCenter = this.centers.filter(
        ct => ct.stickers[0].getOrientation().add(cross.vec).abs() < EPS
      )[0];

      let pieces = this.cube.pieces.filter(pc => pieceInCenter(topCenter, pc));

      if (pieces.every(pc => pc.stickers.some(st => centerStickerAligned(topCenter, st)))) {
        res.push({
          topCenter,
          f2l: results[i],
        });
      }
    }

    return res.length ? res : null;
  }

  private pll(oll: OLLResult[] | null): PLLResult[] | null {
    if (!oll || oll.length === 0 || oll[0].f2l.pairs.length != 4) return null;

    let res: PLLResult[] = [];

    for (let o = 0, maxo = oll.length; o < maxo; o += 1) {
      let { topCenter } = oll[o];
      let pieces = this.cube.pieces.filter(pc => pieceInCenter(topCenter, pc));
      let vecs = this.cube.p.faceVectors;
      let cols = vecs.map(_ => "");

      for (let i = 0, maxi = pieces.length; i < maxi; i += 1) {
        let st = getColoredStickers(pieces[i]);

        for (let j = 0, maxj = st.length; j < maxj; j += 1) {
          let u = st[j].getOrientation();
          let v = vecs.find(v => v.sub(u).abs() < EPS);
          if (!v) return null;
          let pos = vecs.indexOf(v);

          if (!cols[pos]) {
            cols[pos] = st[j].color;
          } else if (cols[pos] != st[j].color) {
            return null;
          }
        }
      }

      res.push({
        oll: oll[o],
      });
    }

    return res.length === 0 ? null : res;
  }

  completed(): boolean {
    let centers = this.centers;
    return this.cube.pieces.every(pc => pieceInPlace(centers, pc));
  }

  getStatus(): CFOPStatus {
    let cross = this.cross();
    let f2l = this.f2l(cross);
    let oll = this.oll(f2l);
    let pll = this.pll(oll);
    let completed = this.completed();
    let auf = !!(pll && !completed);

    if (cross.length === 0) {
      this.stage = Stage.SCRAMBLED;
    } else if (!f2l || f2l.total === 0) {
      this.stage = Stage.CROSS;
    } else if (!oll) {
      this.stage = [Stage.F2L_PAIR1, Stage.F2L_PAIR2, Stage.F2L_PAIR3, Stage.F2L_PAIR4][
        f2l.pairs.reduce((acc, e) => Math.max(acc, e.pairs.length), 0) - 1
      ];
    } else if (!pll) {
      this.stage = Stage.OLL;
    } else if (!auf && !completed) {
      this.stage = Stage.PLL;
    } else if (completed) {
      // this.stage = completed ? Stage.COMPLETED : Stage.AUF;
      this.stage = Stage.COMPLETED;
    }

    return { cross, f2l, oll, pll, auf, completed, stage: this.stage, facelet: this.toFacelet() };
  }

  feed(seq: CFOPTimeline["moves"][number]) {
    if (this.lastTime < 0) {
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

    if (!status.f2l) return null;

    let bottomLayer = status.f2l.pairs.filter(p => p.pairs.length === 4)[0].cross.vec;
    let algs = this.OLLAlgs;
    let cube = Puzzle.fromFacelet(status.facelet, "rubik");

    let faceTransform: any[] = [
      // Transformation according to the cross face
      [UP, "z2"],
      [RIGHT, "z"],
      [FRONT, "x'"],
      [DOWN, ""],
      [LEFT, "z'"],
      [BACK, "x"],
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
        if (equivalentFacelets(facelet, facelets[i], "OLL")) {
          return alg;
        }
      }
    }

    return null;
  }

  async detectPLL(status: CFOPStatus): Promise<Algorithm | null> {
    await this.getAlgs();

    if (!status.f2l) return null;

    let bottomLayer = status.f2l.pairs.filter(p => p.pairs.length === 4)[0].cross.vec;
    let algs = this.PLLAlgs;
    let cube = Puzzle.fromFacelet(status.facelet, "rubik");

    let faceTransform: any[] = [
      // Transformation according to the cross face
      [UP, "z2"],
      [RIGHT, "z"],
      [FRONT, "x'"],
      [DOWN, ""],
      [LEFT, "z'"],
      [BACK, "x"],
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
        if (equivalentFacelets(facelet, facelets[i], "PLL")) {
          return alg;
        }
      }
    }

    return null;
  }

  async getAnalysis(totalTime: number): Promise<ReconstructorMethod> {
    if (this.moves.length) {
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

    let moveCounts = steps.map(subs => subs.map(_ => 0));
    let time = steps.map(subs => subs.map(_ => 0));
    let moves = steps.map(subs => subs.map(_ => <string[]>[]));
    let st = timeline[0].status;
    let cross: Algorithm | null = null;
    let oll: Algorithm | null = null;
    let pll: Algorithm | null = null;
    let crossTrans = "";

    for (let s = 0, maxs = steps.length, i = 0; s < maxs && i < timeline.length; s += 1) {
      let substep = steps[s];

      for (let j = 0, maxj = substep.length; j < maxj && i < timeline.length; j += 1) {
        if (st.stage === substep[j]) {
          if (st.f2l && st.f2l.pairs.some(p => p.pairs.length === 4) && !st.oll) {
            oll = await this.detectOLL(st);
          }

          if (st.oll && !st.pll) {
            pll = await this.detectPLL(st);
          }

          time[s][j] = timeline[i].time;
          moveCounts[s][j] = timeline[i].moves.length;
          moves[s][j] = timeline[i].moves.map(mv => mv.move);

          i += 1;
          i < timeline.length && (st = timeline[i].status);
        }

        if (!cross && (st.oll || st.pll)) {
          let col = st.oll
            ? st.oll[0].f2l.cross.color
            : st.pll
              ? st.pll[0].oll.f2l.cross.color
              : "w";
          let cols = ["w", "r", "g", "y", "o", "b"];
          let trans = ["", "z", "x'", "x2", "z'", "x"];

          for (let i = 0; i < 6; i += 1) {
            if (col === cols[i]) {
              crossTrans = trans[i];
              cross = {
                name: "",
                shortName: "",
                order: 3,
                mode: CubeMode.CROSS,
                ready: true,
                scramble: trans[i],
                baseColor: col,
                view: "plan",
              };
              break;
            }
          }
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
    let f2ls = time[1].map(
      (t, p): ReconstructorStep => ({
        time: t,
        name: "F2L pair " + (p + 1),
        moveCount: moveCounts[1][p],
        moves: formatMoves(moves[1][p]),
        case: null,
        percent: f2lPercents[p],
        skip: !t,
        substeps: [],
      })
    );

    oll && (oll.scramble += " z2 " + crossTrans);
    pll && (pll.scramble += " z2 " + crossTrans);
    oll && crossTrans && (oll.baseColor = cross?.baseColor);
    pll && crossTrans && (pll.baseColor = cross?.baseColor);

    return {
      name: "CFOP",
      steps: [
        {
          name: "Cross",
          moveCount: moveCounts[0][0],
          moves: formatMoves(moves[0][0]),
          case: cross,
          percent: percents[0],
          skip: false,
          substeps: [],
          time: time[0][0],
          addZ2: false,
        },
        {
          name: "F2L",
          moveCount: sum(moveCounts[1]),
          moves: [],
          case: null,
          percent: percents[1],
          skip: false,
          substeps: f2ls,
          time: sum(time[1]),
        },
        {
          name: "OLL",
          moveCount: moveCounts[2][0],
          moves: formatMoves(moves[2][0]),
          case: oll,
          percent: percents[2],
          skip: false,
          substeps: [],
          time: time[2][0],
        },
        {
          name: "PLL",
          moveCount: sum(moveCounts[3]),
          moves: formatMoves(moves[3].reduce((acc, e) => [...acc, ...e], [])),
          case: pll,
          percent: percents[3],
          skip: false,
          substeps: [],
          time: sum(time[3]),
        },
      ],
    };
  }
}
