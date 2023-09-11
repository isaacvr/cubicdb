import { SessionDefaultSettings } from "@constants";
import type { SessionSettings } from "@interfaces";

let lens = [ 0, 0, 70, 0, 0, 10, 0, 40, 60, 80, 100 ];
let modes = [ "sqrs", "clkwca", "mgmp", "222so", "skbso", "pyrso", "333", "444wca", "555wca", "666wca", "777wca" ];

export function identifyPuzzle(scramble: string): { mode: string, len: number } {
  let ini = [ 11, 11, 12, 16, 44, 60, 80, 100 ];
  let fin = [ 11, 11, 15, 22, 46, 62, 80, 100 ];
  
  if ( scramble.indexOf('/') > -1 ) {
    return { mode: "sqrs", len: 0 };
  } else if ( scramble.indexOf("++") > -1 || scramble.indexOf("--") > -1 ) {
    return { mode: "mgmp", len: 70 };
  } else if ( scramble.indexOf('ALL') > -1 ) {
    return { mode: "clkwca", len: 0 };
  }
  
  let slen = scramble.split(' ').length;
  let minIdx = -1;
 
  if ( slen === 11 ) {
    minIdx = /^[LRBU\s']+$/.test(scramble) ? 4 : 3;
  } else {
    for (let i = 0, maxi = ini.length; i < maxi; i += 1) {
      if ( ini[i] <= slen && slen <= fin[i] ) {
        minIdx = i;
        break;
      }
    }
  }
  
  return { mode: modes[ minIdx + 3 ], len: lens[ minIdx + 3 ] };
  
}

export function genSettings(): SessionSettings {
  return Object.assign({}, SessionDefaultSettings);
}