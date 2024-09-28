import { SessionDefaultSettings } from "@constants";
import type { SessionSettings } from "@interfaces";

let lens = [0, 0, 10, 0, 40, 60, 80, 100];
let modes = ["222so", "skbso", "pyrso", "333", "444wca", "555wca", "666wca", "777wca"];
let names = ["2x2", "Skewb", "Pyraminx", "3x3", "4x4", "5x5", "6x6", "7x7"];

export function identifyPuzzle(scramble: string): { mode: string; name: string; len: number } {
  let ini = [9, 8, 11, 16, 35, 60, 80, 100];
  let fin = [11, 11, 15, 22, 55, 62, 80, 100];

  if (scramble.indexOf("/") > -1) {
    return { mode: "sqrs", name: names[0], len: 0 };
  } else if (scramble.indexOf("++") > -1 || scramble.indexOf("--") > -1) {
    return { mode: "mgmp", name: names[2], len: 70 };
  } else if (scramble.indexOf("ALL") > -1) {
    return { mode: "clkwca", name: names[1], len: 0 };
  } else if (/[urlb]/.test(scramble)) {
    // Pyraminx
    return { mode: modes[2], name: names[2], len: lens[2] };
  }

  let slen = scramble.split(/\s+/).length;
  let minIdx = 3;

  for (let i = 0, maxi = ini.length; i < maxi; i += 1) {
    if (ini[i] <= slen && slen <= fin[i]) {
      minIdx = i;
      break;
    }
  }

  if (minIdx < 2) {
    minIdx = /^[LRBU\s']+$/.test(scramble) ? 1 : 0;
  }

  return { mode: modes[minIdx], name: names[minIdx], len: lens[minIdx] };
}

export function genSettings(): SessionSettings {
  return Object.assign({}, SessionDefaultSettings);
}
