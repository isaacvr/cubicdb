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

import { circle, createPrun, get8Perm, getPruning, rn, set8Perm } from "../lib/mathlib";
import { regScrambler } from "./scramble";

const cmv = [];
const cprun = [];

function initCornerMoveTable() {
  let g = [],
    temp;

  for (let i = 0; i < 40320; i++) {
    cmv[i] = [];
  }
  for (let i = 0; i < 40320; i++) {
    set8Perm(g, i);
    circle(g, 0, 1, 2, 3);
    temp = cmv[0][i] = get8Perm(g); //U
    circle(g, 4, 5, 6, 7);
    temp = cmv[1][temp] = get8Perm(g); //D
    circle(g, 2, 5)(g, 3, 6);
    temp = cmv[2][temp] = get8Perm(g); //R
    circle(g, 0, 5)(g, 3, 4);
    cmv[3][temp] = get8Perm(g); //F
  }
}

function doEdgeMove(idx, m) {
  if (m < 2) {
    return idx;
  }
  const g = set8Perm([], idx, 3);
  if (m == 2) {
    circle(g, 0, 1);
  } else if (m == 3) {
    circle(g, 0, 2);
  }
  return get8Perm(g, 3);
}

let initRet = false;

function init() {
  if (initRet) {
    return;
  }
  initRet = true;
  initCornerMoveTable();
  createPrun(cprun, 0, 40320, 12, cmv, 4, 3);
}

function search(corner, edge, maxl, lm, sol) {
  if (maxl == 0) {
    return corner + edge == 0;
  }
  if (getPruning(cprun, corner) > maxl) return false;
  let h, g, f, i;
  for (i = 0; i < 4; i++) {
    if (i != lm) {
      h = corner;
      g = edge;
      for (f = 0; f < (i < 2 ? 3 : 1); f++) {
        h = cmv[i][h];
        g = doEdgeMove(g, i);
        if (search(h, g, maxl - 1, i, sol)) {
          sol.push(["U", "D", "R2", "F2"][i] + (i < 2 ? " 2'".charAt(f) : ""));
          return true;
        }
      }
    }
  }
}

function generateScramble() {
  init();
  let b, c;
  do {
    c = rn(40320);
    b = rn(6);
  } while (b + c == 0);
  const d = [];
  for (let a = 0; a < 99; a++) {
    if (search(c, b, a, -1, d)) {
      break;
    }
  }
  return d.reverse().join(" ");
}

regScrambler("223", generateScramble);
