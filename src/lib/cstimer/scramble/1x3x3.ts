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

import { acycle, get8Perm, getNParity, rn, set8Perm, Solver } from "../lib/mathlib";
import { regScrambler } from "./scramble";

const solv = new Solver(4, 1, [[0, doMove, 384]]);
const movePieces = [
  [0, 1],
  [2, 3],
  [0, 3],
  [1, 2],
];

function doMove(idx, m) {
  const arr = set8Perm([], idx >> 4, 4);
  acycle(arr, movePieces[m]);
  return (get8Perm(arr, 4) << 4) + ((idx & 15) ^ (1 << m));
}

function generateScramble() {
  let c = 1 + rn(191);
  c = c * 2 + ((getNParity(c >> 3, 4) ^ (c >> 1) ^ (c >> 2) ^ c) & 1);
  return solv.toStr(solv.search([c], 0), "RLFB", [""]);
}

regScrambler("133", generateScramble);
