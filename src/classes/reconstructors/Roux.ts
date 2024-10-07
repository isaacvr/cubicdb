import { Puzzle } from "@classes/puzzle/puzzle";
import type { IReconstructor, ReconstructorMethod } from "./interfaces";
import type { Piece } from "@classes/puzzle/Piece";
import { Vector3D } from "@classes/vector3d";
import { piecesCorrectRelative, pieceInCenterColor, getColoredStickers, nonGray } from "./utils";
import { EPS } from "@constants";
import { calcPercents, sum } from "@helpers/math";
import { formatMoves } from "@helpers/strings";

enum Stage {
  SCRAMBLED = 0,
  BLOCK_123_1 = 1,
  BLOCK_123_2 = 2,
  CO = 3,
  CP = 4,
  EO = 5,
  UL_UR = 6,
  EP = 7,
  COMPLETED = 8,
}

interface RouxStatus {
  block1: BlockResult[] | null;
  block2: BlockResult[] | null;
  cmll: any;
  eo: any;
  ulur: any;
  ep: any;
  stage: Stage;
  facelet: string;
}

interface RouxTimeline {
  status: RouxStatus;
  moves: { move: string; time: number }[];
  time: number;
}

interface BlockResult {
  center: Piece;
  corners: Piece[];
  edges: Piece[];
  vec: Vector3D;
  vecDown: Vector3D;
}

interface COResult {
  co: boolean;
  downColor: string;
  upColor: string;
}

interface CMLLResult {
  block1: BlockResult;
  block2: BlockResult;
  co: COResult;
  cp: boolean;
}

export class Roux implements IReconstructor {
  facelet: string;

  cube: Puzzle;
  private centers: Piece[];
  private edges: Piece[];
  private corners: Piece[];
  private stage: Stage;
  private status: RouxTimeline[];
  private lastTime: number;
  private currTime: number;
  private moves: RouxTimeline["moves"];

  constructor(facelet?: string) {
    this.facelet = "";
    this.cube = new Puzzle({ type: "rubik" });
    this.centers = [];
    this.edges = [];
    this.corners = [];
    this.stage = Stage.COMPLETED;
    this.status = [];
    this.lastTime = 0;
    this.currTime = 0;
    this.moves = [];

    this.setFacelet(facelet || "");
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
    this.setFacelet(
      Puzzle.fromSequence(scramble, {
        type: "rubik",
        order: [3, 3, 3],
      }).toFacelet()
    );
  }

  toFacelet(): string {
    return this.cube.toFacelet();
  }

  getBlocks(): BlockResult[] {
    let blocks = this.centers
      .map(c => ({
        center: c,
        corners: this.corners.filter(cn => pieceInCenterColor(c, cn)),
        edges: this.edges.filter(ed => pieceInCenterColor(c, ed)),
      }))
      .map(cn => {
        if (cn.corners.length < 2 || cn.edges.length < 3) return [];
        let { corners, edges } = cn;

        let res = [];

        for (let i = 0, maxi = corners.length; i < maxi - 1; i += 1) {
          for (let j = i + 1; j < maxi; j += 1) {
            if (piecesCorrectRelative(corners[i], corners[j])) {
              let edges1 = edges.filter(ed => piecesCorrectRelative(corners[i], ed));
              let edges2 = edges.filter(ed => piecesCorrectRelative(corners[j], ed));

              if (edges1.length < 2 || edges2.length < 2) continue;

              res.push({
                center: cn.center,
                corners: [corners[i], corners[j]],
                edges: [...edges1, ...edges2].reduce(
                  (acc, e) => (acc.indexOf(e) > -1 ? acc : [...acc, e]),
                  [] as Piece[]
                ),
              });
            }
          }
        }

        return res;
      })
      .reduce((acc, e) => (e.length ? [...acc, ...e] : acc), []);

    return blocks.map(bl => ({
      center: bl.center,
      corners: bl.corners,
      edges: bl.edges,
      vec: bl.center.stickers[0].getOrientation(),
      vecDown: bl.corners[0].stickers
        .filter(
          st => nonGray(st) && bl.corners[1].contains(st.color) && !bl.center.contains(st.color)
        )[0]
        .getOrientation(),
    }));
  }

  getCO(block1: BlockResult[]): COResult[] {
    let results: COResult[] = [];

    for (let i = 0, maxi = block1.length; i < maxi; i += 1) {
      let b1 = block1[i];
      let downColor = b1.corners[0].stickers.filter(
        st => nonGray(st) && st.getOrientation().sub(b1.vecDown).abs() < EPS
      )[0].color;

      let corners = this.corners.filter(corner => !corner.contains(downColor));
      let upColor = getColoredStickers(corners[0]).filter(st =>
        corners.every(c => c.contains(st.color))
      )[0].color;

      results.push({
        co: corners.every(
          c =>
            c.contains(upColor) &&
            getColoredStickers(c).filter(
              st => st.color === upColor && st.getOrientation().add(b1.vecDown).abs() < EPS
            ).length
        ),
        downColor,
        upColor,
      });
    }

    return results;
  }

  getCP(block1: BlockResult[], co: COResult[]): boolean[] {
    return co.map((c, pos) => {
      if (!c.co) return false;

      let bl = block1[pos].vecDown;
      let downColor = block1[pos].corners[0].stickers.filter(
        st => nonGray(st) && st.getOrientation().sub(bl).abs() < EPS
      )[0].color;

      let corners = this.corners.filter(corner => !corner.contains(downColor));

      for (let i = 0, maxi = corners.length; i < maxi; i += 1) {
        let aligned = 0;

        for (let j = 0; j < maxi; j += 1) {
          if (j != i && piecesCorrectRelative(corners[i], corners[j])) {
            aligned += 1;
          }
        }

        if (aligned != 2) return false;
      }

      return true;
    });
  }

  getCMLL(block1: BlockResult[] | null, block2: BlockResult[] | null): CMLLResult[] | null {
    if (!block1 || !block2 || block1.length === 0 || block2.length === 0) {
      return null;
    }

    let co = this.getCO(block1);
    if (co.every(c => !c)) return null;
    let cp = this.getCP(block1, co);

    return block1.map((_, pos) => ({
      block1: block1[pos],
      block2: block1[pos],
      co: co[pos],
      cp: cp[pos],
    }));
  }

  getEO(_cmll: CMLLResult[] | null): boolean[] | null {
    if (!_cmll || _cmll.length === 0) return null;
    let cmll = _cmll.filter(c => c.cp);

    if (cmll.length === 0) return null;

    return cmll.map(c => {
      let {
        block1: { vecDown },
      } = c;
      let sideColors = [c.block1.center, c.block2.center].map(
        pc => getColoredStickers(pc)[0].color
      );
      let { upColor, downColor } = c.co;

      let remEdges = this.edges.filter(
        e => (!e.contains(sideColors[0]) && !e.contains(sideColors[1])) || e.contains(upColor)
      );

      return remEdges.every(edge => {
        return getColoredStickers(edge)
          .filter(st => st.color === upColor || st.color === downColor)
          .every(st => st.getOrientation().cross(vecDown).abs() < EPS);
      });
    });
  }

  getULUR(cmll: CMLLResult[] | null, eo: boolean[] | null): boolean {
    if (!cmll || !eo || eo.every(e => !e)) return false;

    for (let i = 0, maxi = eo.length; i < maxi; i += 1) {
      if (!eo[i]) continue;

      let { upColor } = cmll[i].co;
      let color1 = getColoredStickers(cmll[i].block1.center)[0].color;
      let color2 = getColoredStickers(cmll[i].block2.center)[0].color;

      let corners1 = this.corners.filter(
        corner => corner.contains(upColor) && corner.contains(color1)
      );

      let corners2 = this.corners.filter(
        corner => corner.contains(upColor) && corner.contains(color2)
      );

      let edge1 = this.edges.filter(edge => edge.contains(upColor) && edge.contains(color1))[0];

      let edge2 = this.edges.filter(edge => edge.contains(upColor) && edge.contains(color2))[0];

      if (
        corners1.every(cn => piecesCorrectRelative(cn, edge1)) &&
        corners2.every(cn => piecesCorrectRelative(cn, edge2))
      ) {
        return true;
      }
    }

    return false;
  }

  getStatus(): RouxStatus {
    let blocks = this.getBlocks();
    let blockPair = [];

    for (let i = 0, maxi = blocks.length; i + 1 < maxi; i += 1) {
      for (let j = i + 1; j < maxi; j += 1) {
        if (
          blocks[i].vecDown.sub(blocks[j].vecDown).abs() < EPS &&
          blocks[i].vec.add(blocks[j].vec).abs() < EPS
        ) {
          blockPair.push([blocks[i], blocks[j]]);
        }
      }
    }

    let block1: BlockResult[] | null = null;
    let block2: BlockResult[] | null = null;

    if (blockPair.length) {
      block1 = blockPair.map(b => b[0]);
      block2 = blockPair.map(b => b[1]);
    } else if (blocks.length) {
      block1 = blocks;
    }

    let cmll = this.getCMLL(block1, block2);
    let eo = this.getEO(cmll);
    let ulur = this.getULUR(cmll, eo);
    let completed = this.cube.isComplete();

    if (blocks.length === 0) {
      this.stage = Stage.SCRAMBLED;
    } else if (blockPair.length === 0) {
      this.stage = Stage.BLOCK_123_1;
    } else if (!cmll || cmll.every(cres => !cres.co.co)) {
      this.stage = Stage.BLOCK_123_2;
    } else if (cmll.every(cres => !cres.cp)) {
      this.stage = Stage.CO;
    } else if (!eo || eo.every(e => !e)) {
      this.stage = Stage.CP;
    } else if (!ulur) {
      this.stage = Stage.EO;
    } else if (!completed) {
      this.stage = Stage.UL_UR;
    } else {
      this.stage = Stage.COMPLETED;
    }

    return {
      block1,
      block2,
      cmll,
      eo: null,
      ulur: null,
      ep: null,
      facelet: this.toFacelet(),
      stage: this.stage,
    };
  }

  getTimeline() {
    return this.status;
  }

  feed(seq: RouxTimeline["moves"][number]) {
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

  async getAnalysis(totalTime: number): Promise<ReconstructorMethod> {
    if (this.moves.length) {
      this.moves.forEach(mv => this.feed(mv));
      this.moves.length = 0;
    }

    let timeline = this.getTimeline();
    let steps = [
      [Stage.SCRAMBLED], // Block1
      [Stage.BLOCK_123_1], // Block2
      [Stage.BLOCK_123_2, Stage.CO], // CMLL
      [Stage.CP, Stage.EO, Stage.UL_UR, Stage.EP, Stage.COMPLETED], // LSE
    ];

    let moveCounts = steps.map(subs => subs.map(_ => 0));
    let time = steps.map(subs => subs.map(_ => 0));
    let moves = steps.map(subs => subs.map(_ => <string[]>[]));
    let st = timeline[0].status;
    let timelineLen = timeline.length;

    for (let s = 0, maxs = steps.length, i = 0; s < maxs && i < timelineLen; s += 1) {
      let substep = steps[s];

      for (let j = 0, maxj = substep.length; j < maxj && i < timelineLen; j += 1) {
        if (st.stage === substep[j]) {
          time[s][j] = timeline[i].time;
          moveCounts[s][j] = timeline[i].moves.length;
          moves[s][j] = timeline[i].moves.map(mv => mv.move);

          i += 1;
          i < timelineLen && (st = timeline[i].status);
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
    let CMLLPercents = calcPercents(time[2], sum(time[2]));
    let LSEPercents = calcPercents(time[3], sum(time[3]));

    return {
      name: "Roux",
      steps: [
        {
          name: "Block 1",
          moveCount: moveCounts[0][0],
          moves: formatMoves(moves[0][0]),
          case: null,
          percent: percents[0],
          skip: !moveCounts[0][0],
          substeps: [],
          time: sum(time[0]),
        },
        {
          name: "Block 2",
          moveCount: moveCounts[1][0],
          moves: formatMoves(moves[1][0]),
          case: null,
          percent: percents[1],
          skip: !moveCounts[1][0],
          substeps: [],
          time: sum(time[1]),
        },
        {
          name: "CMLL",
          moveCount: sum(moveCounts[2]),
          moves: [],
          case: null,
          percent: percents[2],
          skip: !sum(moveCounts[2]),
          substeps: [
            {
              name: "CO",
              moveCount: moveCounts[2][0],
              moves: formatMoves(moves[2][0]),
              case: null,
              percent: CMLLPercents[0],
              skip: !moveCounts[2][0],
              substeps: [],
              time: time[2][0],
            },
            {
              name: "CP",
              moveCount: moveCounts[2][1],
              moves: formatMoves(moves[2][1]),
              case: null,
              percent: CMLLPercents[1],
              skip: !moveCounts[2][1],
              substeps: [],
              time: time[2][1],
            },
          ],
          time: sum(time[2]),
        },
        {
          name: "LSE",
          moveCount: sum(moveCounts[3]),
          moves: [],
          case: null,
          percent: percents[3],
          skip: !sum(moveCounts[3]),
          substeps: [
            {
              name: "EO",
              moveCount: moveCounts[3][0],
              moves: formatMoves(moves[3][0]),
              case: null,
              percent: LSEPercents[0],
              skip: !moveCounts[3][0],
              substeps: [],
              time: time[3][0],
            },
            {
              name: "UL/UR",
              moveCount: moveCounts[3][1],
              moves: formatMoves(moves[3][1]),
              case: null,
              percent: LSEPercents[1],
              skip: !moveCounts[3][1],
              substeps: [],
              time: time[3][1],
            },
            {
              name: "EP",
              moveCount: moveCounts[3][2],
              moves: formatMoves(moves[3][2]),
              case: null,
              percent: LSEPercents[2],
              skip: !moveCounts[3][2],
              substeps: [],
              time: time[3][2],
            },
          ],
          time: sum(time[3]),
        },
      ],
    };
  }
}
