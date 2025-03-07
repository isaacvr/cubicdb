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

import * as p133 from "./1x3x3";
import * as p222 from "./2x2x2";
import * as p223 from "./2x2x3";
import * as p333lse from "./333lse";
import * as pClock from "./clock";
import * as pGear from "./gearcube";
import * as pMega from "./megascramble";
import * as pPyra from "./pyraminx";
import * as p444 from "./scamble_444";
import * as pScramble from "./scramble";
import * as p333 from "./scramble_333";
import * as pSq1 from "./scramble_sq1";
import * as pSkewb from "./skewb";
import * as pUtils from "./utilscramble";
import * as pKilo from "./kilominx";

function getScramble(mode: string, len: number, pb: number): string {
  return (pScramble.scramblers.get(mode) || (() => ""))
    .apply(null, [mode, Math.abs(len), pb < 0 ? undefined : pb])
    .replace(/\\n/g, "<br>")
    .trim();
}

export {
  p133,
  p222,
  p223,
  p333lse,
  pClock,
  pGear,
  pMega,
  pPyra,
  p444,
  pScramble,
  getScramble,
  p333,
  pSq1,
  pSkewb,
  pUtils,
  pKilo,
};
