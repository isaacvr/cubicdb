import { Puzzle } from "@classes/puzzle/puzzle";
import { FRONT, Vector3D } from "@classes/vector3d";

export interface OldPochmanResult {
  centers: string[][];

  edges: string[][];
  flippedEdges: string[][];
  edgeBufferState: ("normal" | "flipped")[];

  corners: string[];
  twistedCorners: { letter: string; dir: 1 | -1 }[];
  twistedCornerBuffer: number;

  parity: boolean;
}

// U              R             F             D             L             B
// 000 000 000    011 111 111   112 222 222   222 333 333   333 344 444   444 445 555
// 012 345 678    901 234 567   890 123 456   789 012 345   678 901 234   567 890 123
// RDB RUU UFD    LLR URD LRF   LLF FFB FDB   LLD BDF UDD   UUB BLU FLU   DRB FBR RBR

export const SPEFFZ_SCHEME = "ABCDEFGHIJKLMNOPQRSTUVWX".split(""); // Speffz

const EDGES = [
  // U
  [1, 46], // A 0
  [5, 10], // B 1
  [7, 19], // C 2
  [3, 37], // D 3

  // L
  [37, 3], // E 4
  [41, 21], // F 5
  [43, 30], // G 6
  [39, 50], // H 7

  // F
  [19, 7], // I 8
  [23, 12], // J 9
  [25, 28], // K 10
  [21, 41], // L 11

  // R
  [10, 5], // M 12
  [14, 48], // N 13
  [16, 32], // O 14
  [12, 23], // P 15

  // B
  [46, 1], // Q 16
  [50, 39], // R 17
  [52, 34], // S 18
  [48, 14], // T 19

  // D
  [28, 25], // U 20
  [32, 16], // V 21
  [34, 52], // W 22
  [30, 43], // X 23
];

const CORNERS = [
  // U
  [0, 47, 36], // A
  [2, 11, 45], // B
  [8, 20, 9], // C
  [6, 38, 18], // D

  // L
  [36, 0, 47], // E
  [38, 18, 6], // F
  [44, 27, 24], // G
  [42, 53, 33], // H

  // F
  [18, 6, 38], // I
  [20, 9, 8], // J
  [26, 29, 15], // K
  [24, 44, 27], // L

  // R
  [9, 8, 20], // M
  [11, 45, 2], // N
  [17, 35, 51], // O
  [15, 26, 29], // P

  // B
  [45, 2, 11], // Q
  [47, 36, 0], // R
  [53, 33, 42], // S
  [51, 17, 35], // T

  // D
  [27, 24, 44], // U
  [29, 15, 26], // V
  [35, 51, 17], // W
  [33, 42, 53], // X
];

const edgeConj = EDGES.map(e => {
  let c = e[1];

  for (let i = 0, maxi = EDGES.length; i < maxi; i += 1) {
    if (EDGES[i][0] === c) return i;
  }

  return -1;
});

const cornerConj = CORNERS.map(e => {
  let c1 = e[1];
  let c2 = e[2];
  let p1 = -1;
  let p2 = -1;

  for (let i = 0, maxi = CORNERS.length; i < maxi && (p1 === -1 || p2 === -1); i += 1) {
    if (CORNERS[i][0] === c1) p1 = i;
    if (CORNERS[i][0] === c2) p2 = i;
  }

  return [p1, p2];
});

function gridToPos(row: number, column: number, order: number): number {
  return row * order + column;
}

function getEdges(order: number, type: number): number[][] {
  const maxEdge = (order - 1) >> 1;
  const mid = order >> 1;

  if (type < 1 && type > maxEdge) return [];

  let anchors = [0, 4, 2, 1, 5, 3].map(n => n * order * order);
  let pos = type + mid - 1;

  let offsets1 = [
    gridToPos(0, pos, order),
    gridToPos(pos + 1, -1, order),
    gridToPos(order, -pos - 1, order),
    gridToPos(order - pos - 1, 0, order),
  ];

  let offsets2 = [
    gridToPos(0, order - pos - 1, order),
    gridToPos(order - pos, -1, order),
    gridToPos(order - 1, pos, order),
    gridToPos(pos, 0, order),
  ];

  let res: number[][] = [];

  for (let i = 0, maxi = anchors.length; i < maxi; i += 1) {
    offsets1.forEach(offset => res.push([anchors[i] + offset]));
  }

  if (order % 2 === 1 && type === 1) {
    for (let i = 0, maxi = res.length; i < maxi; i += 1) {
      res[i][1] = res[edgeConj[i]][0];
    }
  } else {
    let conjOff: number[] = [];

    for (let i = 0, maxi = anchors.length; i < maxi; i += 1) {
      offsets2.forEach(offset => conjOff.push(anchors[i] + offset));
    }

    for (let i = 0, maxi = res.length; i < maxi; i += 1) {
      res[i][1] = conjOff[edgeConj[i]];
    }
  }

  return res;
}

function getCorners(order: number): number[][] {
  let anchors = [0, 4, 2, 1, 5, 3].map(n => n * order * order);

  let offsets = [
    gridToPos(0, 0, order),
    gridToPos(0, order - 1, order),
    gridToPos(order, -1, order),
    gridToPos(order - 1, 0, order),
  ];

  let res: number[][] = [];

  for (let i = 0, maxi = anchors.length; i < maxi; i += 1) {
    offsets.forEach(offset => res.push([anchors[i] + offset]));
  }

  for (let i = 0, maxi = res.length; i < maxi; i += 1) {
    res[i][1] = res[cornerConj[i][0]][0];
    res[i][2] = res[cornerConj[i][1]][0];
  }

  return res;
}

function getCenters(order: number, type: number): number[][] {
  if (order < 4) return [];

  let dims = [];

  if (order & 1) {
    dims = [(order - 2) >> 1, order - 2 - ((order - 2) >> 1)];
  } else {
    dims = [(order - 2) >> 1, (order - 2) >> 1];
  }

  const maxCenter = dims[0] * dims[1];

  if (type > maxCenter) return [];

  let anchors = [0, 4, 2, 1, 5, 3].map(n => n * order * order);
  let coord = new Vector3D(
    Math.floor((type - 1) / dims[1]) + 1.5,
    Math.floor((type - 1) % dims[1]) + 1.5
  );
  let center = new Vector3D(order / 2, order / 2);
  const PI_2 = Math.PI / 2;

  let offsets = [0, 1, 2, 3]
    .map(n => coord.rotate(center, FRONT, -PI_2 * n))
    .map(c => gridToPos(Math.round(c.x - 0.5), Math.round(c.y - 0.5), order));

  let res: number[][] = [];

  for (let i = 0, maxi = anchors.length; i < maxi; i += 1) {
    offsets.forEach(o => res.push([anchors[i] + o]));
  }

  return res;
}

function toASCII(letter: string) {
  return letter.charCodeAt(0) - 65; // 65 is the ASCII value for A
}

function letterToFC(letter: string, facelet: string, coord: number[][]): string {
  if (!/^[A-X]$/.test(letter)) return "";
  let pos = coord[toASCII(letter)];
  return pos.map(p => facelet[p]).join("");
}

function getSolvedFacelet(facelet: string, order: number): string {
  let o2 = order ** 2;
  let ini = o2 >> 1;

  let centers: string = "";

  if (order % 2 === 1) {
    centers = [0, 1, 2, 3, 4, 5].map(n => facelet[n * o2 + ini]).join("");
  } else {
    centers = "URFDLB";
  }

  return centers
    .split("")
    .map(f => f.repeat(o2))
    .join("");
}

function getNextLetter(
  letter: string,
  facelet: string,
  solvedFacelet: string,
  coord: number[][],
  visited: boolean[]
): string | null {
  let pos = letterToFC(letter, facelet, coord);

  for (let i = 0, maxi = SPEFFZ_SCHEME.length; i < maxi; i += 1) {
    if (visited[i]) continue;
    if (pos === letterToFC(SPEFFZ_SCHEME[i], solvedFacelet, coord)) return SPEFFZ_SCHEME[i];
  }

  return null;
}

function samePiece(letter1: string, letter2: string, coord: number[][]): boolean {
  let p1 = coord[toASCII(letter1)].map(e => e).sort((a, b) => a - b);
  let p2 = coord[toASCII(letter2)].map(e => e).sort((a, b) => a - b);

  return p1.every((e, pos) => e === p2[pos]);
}

function getEdgeCicle(
  letter: string,
  facelet: string,
  solvedFacelet: string,
  nEdges: number[][],
  visited: boolean[]
) {
  let cicle: string[] = [letter];
  let currentLetter = letter;

  for (let i = 0; i < 24; i += 1) {
    let nextLetter = getNextLetter(currentLetter, facelet, solvedFacelet, nEdges, visited);

    if (nextLetter) {
      cicle.push(nextLetter);

      if (samePiece(cicle[0], nextLetter, nEdges)) {
        break;
      }

      currentLetter = nextLetter;
    } else break;
  }

  return cicle;
}

function getCornerCicle(
  letter: string,
  facelet: string,
  solvedFacelet: string,
  nCorners: number[][],
  visited: boolean[]
) {
  let cicle: string[] = [letter];
  let currentLetter = letter;

  for (let i = 0; i < 8; i += 1) {
    let nextLetter = getNextLetter(currentLetter, facelet, solvedFacelet, nCorners, visited);

    if (nextLetter) {
      cicle.push(nextLetter);

      if (samePiece(cicle[0], nextLetter, nCorners)) {
        break;
      }

      currentLetter = nextLetter;
    } else break;
  }

  return cicle;
}

function getCenterCicle(
  letter: string,
  facelet: string,
  solvedFacelet: string,
  nCenters: number[][],
  visited: boolean[]
) {
  let cicle: string[] = [letter];
  let currentLetter = letter;
  let vs = visited.slice();

  vs[toASCII(letter)] = true;

  for (let i = 0; i < 24; i += 1) {
    let nextLetter = getNextLetter(currentLetter, facelet, solvedFacelet, nCenters, vs);

    if (nextLetter) {
      cicle.push(nextLetter);
      vs[toASCII(nextLetter)] = true;

      if (samePiece(cicle[0], nextLetter, nCenters)) {
        break;
      }

      currentLetter = nextLetter;
    } else {
      cicle.push(letter); // Back to the starting point
      break;
    }
  }

  return cicle;
}

function markAsVisited(letters: string[], visited: boolean[], coord: number[][]): void {
  for (let i = 0, maxi = letters.length; i < maxi; i += 1) {
    let pos = toASCII(letters[i]);

    if (visited[pos]) continue;

    for (let j = 0, maxj = SPEFFZ_SCHEME.length; j < maxj; j += 1) {
      if (samePiece(letters[i], SPEFFZ_SCHEME[j], coord)) {
        visited[j] = true;
      }
    }
  }
}

function getEdgeCicles(
  buffer: string,
  facelet: string,
  solvedFacelet: string,
  cicles: string[][][],
  flippedEdges: string[][],
  order: number
) {
  const maxEdge = (order - 1) >> 1;

  for (let n = 1; n <= maxEdge; n += 1) {
    let lCicle: string[][] = [];
    let lFlipped: string[] = [];
    let visited = SPEFFZ_SCHEME.map(_ => false);
    let nEdges = getEdges(order, n);
    let mcicle = getEdgeCicle(buffer, facelet, solvedFacelet, nEdges, visited);

    if (mcicle.length) {
      lCicle.push(mcicle);
    }

    markAsVisited(mcicle, visited, nEdges);
    markAsVisited([buffer], visited, nEdges);

    while (visited.some(e => !e)) {
      for (let i = 0, maxi = SPEFFZ_SCHEME.length; i < maxi; i += 1) {
        if (!visited[i]) {
          let cicle = getEdgeCicle(SPEFFZ_SCHEME[i], facelet, solvedFacelet, nEdges, visited);

          if (cicle.length != 2) {
            lCicle.push(cicle);
          } else if (cicle[0] != cicle[1]) {
            lFlipped.push(cicle[0]);
          }

          markAsVisited(cicle, visited, nEdges);
        }
      }
    }

    cicles.push(lCicle);
    flippedEdges.push(lFlipped);
  }
}

function getCornerCicles(
  buffer: string,
  facelet: string,
  solvedFacelet: string,
  cicles: string[][],
  twistedCorners: OldPochmanResult["twistedCorners"],
  order: number
) {
  let visited = SPEFFZ_SCHEME.map(_ => false);
  let nCorners = getCorners(order);
  let mcicle = getCornerCicle(buffer, facelet, solvedFacelet, nCorners, visited);

  mcicle.pop();
  mcicle.shift();

  if (mcicle.length) {
    cicles.push(mcicle);
  }

  markAsVisited(mcicle, visited, nCorners);
  markAsVisited([buffer], visited, nCorners);

  while (visited.some(e => !e)) {
    for (let i = 0, maxi = SPEFFZ_SCHEME.length; i < maxi; i += 1) {
      if (!visited[i]) {
        let cicle = getCornerCicle(SPEFFZ_SCHEME[i], facelet, solvedFacelet, nCorners, visited);

        if (cicle.length != 2) {
          cicles.push(cicle);
        } else if (cicle[0] != cicle[1]) {
          let pos1 = nCorners[toASCII(cicle[0])];
          let pos2 = nCorners[toASCII(cicle[1])];

          let dir = (pos2.indexOf(pos1[0]) - 1) * 2 - 1; // for 1 => -1 and for 2 => 1

          twistedCorners.push({
            letter: cicle[0],
            dir: dir as -1 | 1,
          });
        }

        markAsVisited(cicle, visited, nCorners);
      }
    }
  }
}

function getCenterCicles(
  buffer: string,
  facelet: string,
  solvedFacelet: string,
  cicles: string[][][],
  order: number
) {
  if (order < 4) return;

  let dims = [];

  if (order & 1) {
    dims = [(order - 2) >> 1, order - 2 - ((order - 2) >> 1)];
  } else {
    dims = [(order - 2) >> 1, (order - 2) >> 1];
  }

  const maxCenter = dims[0] * dims[1];

  for (let n = 1; n <= maxCenter; n += 1) {
    let lCicle: string[][] = [];
    let nCenters = getCenters(order, n);
    let visited = SPEFFZ_SCHEME.map(
      (_, p) => solvedFacelet[nCenters[p][0]] === facelet[nCenters[p][0]]
    );
    let mcicle = getCenterCicle(buffer, facelet, solvedFacelet, nCenters, visited);

    mcicle.pop();
    mcicle.shift();

    if (mcicle.length) {
      lCicle.push(mcicle);
    }

    markAsVisited(mcicle, visited, nCenters);
    markAsVisited([buffer], visited, nCenters);

    while (visited.some(e => !e)) {
      for (let i = 0, maxi = SPEFFZ_SCHEME.length; i < maxi; i += 1) {
        if (!visited[i]) {
          let cicle = getCenterCicle(SPEFFZ_SCHEME[i], facelet, solvedFacelet, nCenters, visited);
          markAsVisited(cicle, visited, nCenters);
          lCicle.push(cicle);
        }
      }
    }

    cicles.push(lCicle);
  }
}

export function getOldPochman(
  scramble: string,
  eBuffer: string,
  cBuffer: string,
  cnBuffer: string,
  order: number
): OldPochmanResult {
  let pz = Puzzle.fromSequence(scramble, { type: "rubik", order: [order] }, false, true);
  let facelet = pz.toFacelet();
  let solvedFacelet = getSolvedFacelet(facelet, order);

  let eCicles: string[][][] = [];
  let cCicles: string[][] = [];
  let cnCicles: string[][][] = [];
  let flippedEdges: string[][] = [];
  let twistedCorners: OldPochmanResult["twistedCorners"] = [];

  getEdgeCicles(eBuffer, facelet, solvedFacelet, eCicles, flippedEdges, order);
  getCornerCicles(cBuffer, facelet, solvedFacelet, cCicles, twistedCorners, order);
  getCenterCicles(cnBuffer, facelet, solvedFacelet, cnCicles, order);

  let edgeLetters = eCicles.map(c => c.reduce((acc, e) => [...acc, ...e], []));
  let centerLetters = cnCicles.map(c => c.reduce((acc, e) => [...acc, ...e], []));
  let cornerLetters = cCicles.reduce((acc, e) => [...acc, ...e], []);
  let co = ((twistedCorners.reduce((acc, e) => acc + e.dir, 0) % 3) + 3) % 3;

  return {
    centers: centerLetters,

    edges: edgeLetters,
    flippedEdges,
    edgeBufferState: flippedEdges.map(fe =>
      fe.length % 2 === 1 ? 'flipped' : "normal"
    ),

    corners: cornerLetters,
    twistedCorners: twistedCorners,
    twistedCornerBuffer: co === 0 ? 0 : co === 1 ? -1 : 1,

    parity: edgeLetters.length % 2 === 1,
  };
}
