/**
 * Copyright (C) 2023  Shuang Chen

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.

  -----------------------------------------------------------------------
  
  Modified by Isaac Vega <isaacvega1996@gmail.com>
 */

import { Solver, acycle, coord, rn, rndEl, rndPerm } from "../lib/mathlib";
import { mega, formatScramble as fScramble, regScrambler } from "./scramble";

const cubesuff = ["", "2", "'"];
const minxsuff = ["", "2", "'", "2'"];
const args = {
  "111": [[["x"], ["y"], ["z"]], cubesuff], // 1x1x1
  "2223": [[["U"], ["R"], ["F"]], cubesuff], // 2x2x2 (3-gen)
  "2226": [[[["U", "D"]], [["R", "L"]], [["F", "B"]]], cubesuff], // 2x2x2 (6-gen)
  "333o": [
    [
      ["U", "D"],
      ["R", "L"],
      ["F", "B"],
    ],
    cubesuff,
  ], // 3x3x3 (old style)
  "334": [
    [
      [
        ["U", "U'", "U2"],
        ["u", "u'", "u2"],
      ],
      [["R2", "L2", "M2"]],
      [["F2", "B2", "S2"]],
    ],
  ], // 3x3x4
  "336": [
    [
      [
        ["U", "U'", "U2"],
        ["u", "u'", "u2"],
        ["3u", "3u2", "3u'"],
      ],
      [["R2", "L2", "M2"]],
      [["F2", "B2", "S2"]],
    ],
  ], // 3x3x6
  "888": [
    [
      ["U", "D", "u", "d", "3u", "3d", "4u"],
      ["R", "L", "r", "l", "3r", "3l", "4r"],
      ["F", "B", "f", "b", "3f", "3b", "4f"],
    ],
    cubesuff,
  ], // 8x8x8 (SiGN)
  "999": [
    [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b"],
    ],
    cubesuff,
  ], // 9x9x9 (SiGN)
  "101010": [
    [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d", "5u"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l", "5r"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b", "5f"],
    ],
    cubesuff,
  ], // 10x10x10 (SiGN)
  "111111": [
    [
      ["U", "D", "u", "d", "3u", "3d", "4u", "4d", "5u", "5d"],
      ["R", "L", "r", "l", "3r", "3l", "4r", "4l", "5r", "5l"],
      ["F", "B", "f", "b", "3f", "3b", "4f", "4b", "5f", "5b"],
    ],
    cubesuff,
  ], // 11x11x11 (SiGN)
  "444": [
    [
      ["U", "D", "u"],
      ["R", "L", "r"],
      ["F", "B", "f"],
    ],
    cubesuff,
  ], // 4x4x4 (SiGN)
  "444m": [
    [
      ["U", "D", "Uw"],
      ["R", "L", "Rw"],
      ["F", "B", "Fw"],
    ],
    cubesuff,
  ], // 4x4x4 (WCA)
  "555": [
    [
      ["U", "D", "u", "d"],
      ["R", "L", "r", "l"],
      ["F", "B", "f", "b"],
    ],
    cubesuff,
  ], // 5x5x5 (SiGN)
  "555wca": [
    [
      ["U", "D", "Uw", "Dw"],
      ["R", "L", "Rw", "Lw"],
      ["F", "B", "Fw", "Bw"],
    ],
    cubesuff,
  ], // 5x5x5 (WCA)
  "666p": [
    [
      ["U", "D", "2U", "2D", "3U"],
      ["R", "L", "2R", "2L", "3R"],
      ["F", "B", "2F", "2B", "3F"],
    ],
    cubesuff,
  ], // 6x6x6 (prefix)
  "666wca": [
    [
      ["U", "D", "Uw", "Dw", "3Uw"],
      ["R", "L", "Rw", "Lw", "3Rw"],
      ["F", "B", "Fw", "Bw", "3Fw"],
    ],
    cubesuff,
  ], // 6x6x6 (WCA)
  "666s": [
    [
      ["U", "D", "U&sup2;", "D&sup2;", "U&sup3;"],
      ["R", "L", "R&sup2;", "L&sup2;", "R&sup3;"],
      ["F", "B", "F&sup2;", "B&sup2;", "F&sup3;"],
    ],
    cubesuff,
  ], // 6x6x6 (suffix)
  "666si": [
    [
      ["U", "D", "u", "d", "3u"],
      ["R", "L", "r", "l", "3r"],
      ["F", "B", "f", "b", "3f"],
    ],
    cubesuff,
  ], // 6x6x6 (SiGN)
  "777p": [
    [
      ["U", "D", "2U", "2D", "3U", "3D"],
      ["R", "L", "2R", "2L", "3R", "3L"],
      ["F", "B", "2F", "2B", "3F", "3B"],
    ],
    cubesuff,
  ], // 7x7x7 (prefix)
  "777wca": [
    [
      ["U", "D", "Uw", "Dw", "3Uw", "3Dw"],
      ["R", "L", "Rw", "Lw", "3Rw", "3Lw"],
      ["F", "B", "Fw", "Bw", "3Fw", "3Bw"],
    ],
    cubesuff,
  ], // 7x7x7 (prefix)
  "777s": [
    [
      ["U", "D", "U&sup2;", "D&sup2;", "U&sup3;", "D&sup3;"],
      ["R", "L", "R&sup2;", "L&sup2;", "R&sup3;", "L&sup3;"],
      ["F", "B", "F&sup2;", "B&sup2;", "F&sup3;", "B&sup3;"],
    ],
    cubesuff,
  ], // 7x7x7 (suffix)
  "777si": [
    [
      ["U", "D", "u", "d", "3u", "3d"],
      ["R", "L", "r", "l", "3r", "3l"],
      ["F", "B", "f", "b", "3f", "3b"],
    ],
    cubesuff,
  ], // 7x7x7 (SiGN)
  cm3: [
    [
      [
        ["U<", "U>", "U2"],
        ["E<", "E>", "E2"],
        ["D<", "D>", "D2"],
      ],
      [
        ["R^", "Rv", "R2"],
        ["M^", "Mv", "M2"],
        ["L^", "Lv", "L2"],
      ],
    ],
  ], // Cmetrick
  cm2: [
    [
      [
        ["U<", "U>", "U2"],
        ["D<", "D>", "D2"],
      ],
      [
        ["R^", "Rv", "R2"],
        ["L^", "Lv", "L2"],
      ],
    ],
  ], // Cmetrick Mini
  "233": [[[["U", "U'", "U2"]], ["R2", "L2"], ["F2", "B2"]]], // Domino/2x3x3
  fto: [
    [
      ["U", "D"],
      ["F", "B"],
      ["L", "BR"],
      ["R", "BL"],
    ],
    ["", "'"],
  ], // FTO/Face-Turning Octa
  gear: [
    [["U"], ["R"], ["F"]],
    ["", "2", "3", "4", "5", "6", "'", "2'", "3'", "4'", "5'"],
  ],
  sfl: [
    [
      ["R", "L"],
      ["U", "D"],
    ],
    cubesuff,
  ], // Super Floppy Cube
  ufo: [[["A"], ["B"], ["C"], [["U", "U'", "U2'", "U2", "U3"]]]], // UFO
  "2gen": [[["U"], ["R"]], cubesuff], // 2-generator <R,U>
  "2genl": [[["U"], ["L"]], cubesuff], // 2-generator <L,U>
  roux: [[["U"], ["M"]], cubesuff], // Roux-generator <M,U>
  "3gen_F": [[["U"], ["R"], ["F"]], cubesuff], // 3-generator <F,R,U>
  "3gen_L": [[["U"], ["R", "L"]], cubesuff], // 3-generator <R,U,L>
  RrU: [[["U"], ["R", "r"]], cubesuff], // 3-generator <R,r,U>
  RrUu: [
    [
      ["U", "u"],
      ["R", "r"],
    ],
    cubesuff,
  ], // <R,r,U,u>
  minx2g: [[["U"], ["R"]], minxsuff], // megaminx 2-gen
  half: [
    [
      ["U", "D"],
      ["R", "L"],
      ["F", "B"],
    ],
    ["2"],
  ], // 3x3x3 half turns
  lsll: [
    [[["R U R'", "R U2 R'", "R U' R'"]], [["F' U F", "F' U2 F", "F' U' F"]], [["U", "U2", "U'"]]],
  ], // 3x3x3 last slot + last layer (old)
  prco: [
    [
      ["F", "B"],
      ["U", "D"],
      ["L", "DBR"],
      ["R", "DBL"],
      ["BL", "DR"],
      ["BR", "DL"],
    ],
    minxsuff,
  ], // Pyraminx Crystal (old style)
  skb: [
    [["R"], ["L"], ["B"], ["U"]],
    ["", "'"],
  ], // Skewb
  ivy: [
    [["R"], ["L"], ["D"], ["B"]],
    ["", "'"],
  ], // Ivy
  "112": [[["R"], ["R"]], cubesuff], // 1x1x2
  eide: [
    [
      ["OMG"],
      ["WOW"],
      ["WTF"],
      [["WOO-HOO", "WOO-HOO", "MATYAS", "YES", "YES", "YAY", "YEEEEEEEEEEEES"]],
      ["HAHA"],
      ["XD"],
      [":D"],
      ["LOL"],
    ],
    ["", "", "", "!!!"],
  ], // Derrick Eide
};

const args2 = {
  sia113: '#{[["U","u"],["R","r"]],%c,%l} z2 #{[["U","u"],["R","r"]],%c,%l}',
  sia123: '#{[["U"],["R","r"]],%c,%l} z2 #{[["U"],["R","r"]],%c,%l}',
  sia222: '#{[["U"],["R"],["F"]],%c,%l} z2 y #{[["U"],["R"],["F"]],%c,%l}',
  "335": '#{[[["U","U\'","U2"],["D","D\'","D2"]],["R2","L2"],["F2","B2"]],0,%l} / ${333}',
  "337":
    '#{[[["U","U\'","U2","u","u\'","u2","U u","U u\'","U u2","U\' u","U\' u\'","U\' u2","U2 u","U2 u\'","U2 u2"],["D","D\'","D2","d","d\'","d2","D d","D d\'","D d2","D\' d","D\' d\'","D\' d2","D2 d","D2 d\'","D2 d2"]],["R2","L2"],["F2","B2"]],0,%l} / ${333}',
  r234: "2) ${222so}\\n3) ${333}\\n4) ${[444,40]}",
  r2345: '${r234}\\n5) ${["555",60]}',
  r23456: '${r2345}\\n6) ${["666p",80]}',
  r234567: '${r23456}\\n7) ${["777p",100]}',
  r234w: '2) ${222so}\\n3) ${333}\\n4) ${["444m",40]}',
  r2345w: '${r234w}\\n5) ${["555wca",60]}',
  r23456w: '${r2345w}\\n6) ${["666wca",80]}',
  r234567w: '${r23456w}\\n7) ${["777wca",100]}',
  "333ni":
    '${333}#{[[""]],["","Rw ","Rw2 ","Rw\' ","Fw ","Fw\' "],1}#{[[""]],["","Uw","Uw2","Uw\'"],1}',
  "444bld":
    '${444wca}#{[[""]],[""," x"," x2"," x\'"," z"," z\'"],1}#{[[""]],[""," y"," y2"," y\'"],1}',
  "555bld":
    '${["555wca",%l]}#{[[""]],[""," 3Rw"," 3Rw2"," 3Rw\'"," 3Fw"," 3Fw\'"],1}#{[[""]],[""," 3Uw"," 3Uw2"," 3Uw\'"],1}',
};

const edges = {
  "4edge": ["r b2", ["b2 r'", "b2 U2 r U2 r U2 r U2 r"], ["u"]],
  "5edge": ["r R b B", ["B' b' R' r'", "B' b' R' U2 r U2 r U2 r U2 r"], ["u", "d"]],
  "6edge": [
    "3r r 3b b",
    [
      "3b' b' 3r' r'",
      "3b' b' 3r' U2 r U2 r U2 r U2 r",
      "3b' b' r' U2 3r U2 3r U2 3r U2 3r",
      "3b' b' r2 U2 3r U2 3r U2 3r U2 3r U2 r",
    ],
    ["u", "3u", "d"],
  ],
  "7edge": [
    "3r r 3b b",
    [
      "3b' b' 3r' r'",
      "3b' b' 3r' U2 r U2 r U2 r U2 r",
      "3b' b' r' U2 3r U2 3r U2 3r U2 3r",
      "3b' b' r2 U2 3r U2 3r U2 3r U2 3r U2 r",
    ],
    ["u", "3u", "3d", "d"],
  ],
};

function megascramble(type: string, length: number) {
  // @ts-ignore
  const value = args[type];

  switch (value.length) {
    case 1:
      return mega(value[0], [""], length);
    case 2:
      return mega(value[0], value[1], length);
    case 3:
      return mega(value[0], value[1], value[2]);
  }
}

function edgescramble(type: string, length: number) {
  // @ts-ignore
  const value = edges[type];
  return edge(value[0], value[1], value[2], length);
}

function formatScramble(type: string, length: string) {
  // @ts-ignore
  const value = args2[type].replace(/%l/g, length).replace(/%c/g, '["","2","\'"]');
  return fScramble(value);
}

for (const i in args) {
  regScrambler(i, megascramble);
}

for (const i in args2) {
  regScrambler(i, formatScramble);
}

for (const i in edges) {
  regScrambler(i, edgescramble);
}

function cubeNNN(type: string, len: number) {
  const size = len;
  if (size <= 1) {
    return "N/A";
  }
  const data: string[][] = [[], [], []];
  for (let i = 0; i < len - 1; i++) {
    if (i % 2 == 0) {
      data[0].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "U" : "u"));
      data[1].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "R" : "r"));
      data[2].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "F" : "f"));
    } else {
      data[0].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "D" : "d"));
      data[1].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "L" : "l"));
      data[2].push((i < 4 ? "" : ~~(i / 2 + 1)) + (i < 2 ? "B" : "b"));
    }
  }
  return mega(data, cubesuff, size * 10);
}

regScrambler("cubennn", cubeNNN);

function edge(start: string, end: any[], moves: any[], len: number) {
  let u = 0,
    d = 0,
    movemis = [];
  const triggers = [
    ["R", "R'"],
    ["R'", "R"],
    ["L", "L'"],
    ["L'", "L"],
    ["F'", "F"],
    ["F", "F'"],
    ["B", "B'"],
    ["B'", "B"],
  ];
  const ud = ["U", "D"];
  let scramble = start;
  // initialize move misalignments
  for (let i = 0; i < moves.length; i++) {
    movemis[i] = 0;
  }

  for (let i = 0; i < len; i++) {
    // apply random moves
    let done = false;
    let v = "";

    while (!done) {
      for (let j = 0; j < moves.length; j++) {
        const x = rn(4);
        movemis[j] += x;
        if (x != 0) {
          done = true;
          v += " " + moves[j] + cubesuff[x - 1];
        }
      }
    }
    // apply random trigger, update U/D
    const trigger = rn(8);
    const layer = rn(2);
    const turn = rn(3);
    scramble +=
      v +
      " " +
      triggers[trigger][0] +
      " " +
      ud[layer] +
      cubesuff[turn] +
      " " +
      triggers[trigger][1];
    if (layer == 0) {
      u += turn + 1;
    }
    if (layer == 1) {
      d += turn + 1;
    }
  }

  // fix everything
  for (let i = 0; i < moves.length; i++) {
    const x = 4 - (movemis[i] % 4);
    if (x < 4) {
      scramble += " " + moves[i] + cubesuff[x - 1];
    }
  }
  u = 4 - (u % 4);
  d = 4 - (d % 4);
  if (u < 4) {
    scramble += " U" + cubesuff[u - 1];
  }
  if (d < 4) {
    scramble += " D" + cubesuff[d - 1];
  }
  scramble += " " + rndEl(end);
  return scramble;
}

// Megaminx
const epcord = new coord("p", 6, -1);
const eocord = new coord("o", 6, -2);
const cpcord = new coord("p", 6, -1);
const cocord = new coord("o", 6, -3);

function eMove(idx: number, m: number) {
  const perm = epcord.set([], idx >> 5);
  const twst = eocord.set([], idx & 0x1f);
  if (m == 0) {
    acycle(twst, [0, 1, 2, 3, 4], 1);
    acycle(perm, [0, 1, 2, 3, 4], 1);
  } else if (m == 1) {
    acycle(twst, [0, 1, 2, 3, 5], 1);
    acycle(perm, [0, 1, 2, 3, 5], 1);
  } else if (m == 2) {
    acycle(twst, [1, 2, 3, 4, 5], 1, [0, 0, 0, 0, 1, 2]);
    acycle(perm, [1, 2, 3, 4, 5]);
  }
  return (epcord.get(perm) << 5) | eocord.get(twst);
}

function cMove(idx: number, m: number) {
  const perm = cpcord.set([], ~~(idx / 243));
  const twst = cocord.set([], idx % 243);
  if (m == 0) {
    acycle(twst, [0, 1, 2, 3, 4], 1);
    acycle(perm, [0, 1, 2, 3, 4], 1);
  } else if (m == 1) {
    acycle(twst, [0, 5, 1, 2, 3], 1, [2, 0, 0, 0, 0, 3]);
    acycle(perm, [0, 5, 1, 2, 3]);
  } else if (m == 2) {
    acycle(twst, [0, 2, 3, 4, 5], 1, [1, 0, 0, 0, 1, 3]);
    acycle(perm, [0, 2, 3, 4, 5]);
  }
  return cpcord.get(perm) * 243 + cocord.get(twst);
}

const solv = new Solver(3, 4, [
  [0, eMove, 32 * 360],
  [0, cMove, 243 * 360],
]);

function getMinxLSScramble(type: string, length: number, cases: any) {
  let edge = 0;
  let corn = 0;
  do {
    if (type == "mlsll") {
      edge = rn(32 * 360);
      corn = rn(243 * 360);
    } else if (type == "mgmpll") {
      edge = epcord.get(rndPerm(5, true).concat([5])) * 32;
      corn = cpcord.get(rndPerm(5, true).concat([5])) * 243;
    } else if (type == "mgmll") {
      const eo = eocord.set([], rn(32));
      eo[0] += eo[5];
      eo[5] = 0;
      const co = cocord.set([], rn(243));
      co[0] += co[5];
      co[5] = 0;
      edge = epcord.get(rndPerm(5, true).concat([5])) * 32 + eocord.get(eo);
      corn = cpcord.get(rndPerm(5, true).concat([5])) * 243 + cocord.get(co);
    }
  } while (edge == 0 && corn == 0);
  const sol = solv.search([edge, corn], 0)!;
  const ret = [];
  for (let i = 0; i < sol.length; i++) {
    const move = sol[i];
    ret.push(
      ["U", "R U", "F' U"][move[0]] + ["", "2", "2'", "'"][move[1]] + ["", " R'", " F"][move[0]]
    );
  }
  return ret.join(" ").replace(/ +/g, " ");
}

regScrambler("mlsll", getMinxLSScramble)("mgmpll", getMinxLSScramble)("mgmll", getMinxLSScramble);
