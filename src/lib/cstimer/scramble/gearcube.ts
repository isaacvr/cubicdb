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

import { acycle, createMove, createPrun, get8Perm, getPruning, rn, set8Perm } from "../lib/mathlib";
import { regScrambler } from "./scramble";

const cmv = [];
const emv = [];
const prun = [[], [], []];

const moveEdges = [
  [0, 3, 2, 1],
  [0, 1],
  [0, 3],
];

function cornerMove(arr, m) {
  acycle(arr, [0, m + 1]);
}

function edgeMove(idx, m) {
  const arr = set8Perm([], ~~(idx / 3), 4);
  acycle(arr, moveEdges[m]);
  return get8Perm(arr, 4) * 3 + (((idx % 3) + (m == 0 ? 1 : 0)) % 3);
}

function doMove(off, idx, m) {
  let edge = idx % 72;
  let corner = ~~(idx / 72);
  corner = cmv[m][corner];
  edge = emv[(m + off) % 3][edge];
  return corner * 72 + edge;
}

function getPrun(state) {
  return Math.max(
    getPruning(prun[0], state[0] * 72 + state[1]),
    getPruning(prun[1], state[0] * 72 + state[2]),
    getPruning(prun[2], state[0] * 72 + state[3])
  );
}

function search(state, maxl, lm, sol) {
  if (maxl == 0) {
    return state[0] == 0 && state[1] == 0 && state[2] == 0 && state[3] == 0;
  }
  if (getPrun(state) > maxl) {
    return false;
  }
  for (let m = 0; m < 3; m++) {
    if (m == lm) {
      continue;
    }
    const statex = state.slice();
    for (let a = 0; a < 11; a++) {
      statex[0] = cmv[m][statex[0]];
      for (let i = 1; i < 4; i++) {
        statex[i] = emv[(m + i - 1) % 3][statex[i]];
      }
      if (search(statex, maxl - 1, m, sol)) {
        sol.push("URF".charAt(m) + ["'", "2'", "3'", "4'", "5'", "6", "5", "4", "3", "2", ""][a]);
        return true;
      }
    }
  }
}

let initRet = false;

function init() {
  if (initRet) {
    return;
  }

  initRet = true;
  createMove(emv, 72, edgeMove, 3);
  createMove(cmv, 24, [cornerMove, "p", 4], 3);
  for (let i = 0; i < 3; i++) {
    createPrun(prun[i], 0, 24 * 72, 5, doMove.bind(null, i), 3, 12, 0);
  }
}

function getRandomState() {
  const ret = [rn(24)];
  for (let i = 0; i < 3; i++) {
    do {
      ret[i + 1] = rn(72);
    } while (getPruning(prun[i], ret[0] * 72 + ret[i + 1]) == 15);
  }
  return ret;
}

export function generateGearScramble(type) {
  init();
  let state;
  do {
    state = getRandomState();
  } while (state == 0);
  let len = type == "gearso" ? 4 : 0;
  const sol = [];
  while (true) {
    if (search(state, len, -1, sol)) {
      break;
    }
    len++;
  }
  return sol.reverse().join(" ");
}
regScrambler(["gearo", "gearso"], generateGearScramble);
