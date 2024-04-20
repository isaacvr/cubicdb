import { prettyScramble } from "@helpers/strings";
import { Interpreter } from "./scrambleInterpreter";

export const scrambleReg = /^([\d]+)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?('|2'|2|3'|3)?$/;

export class ScrambleParser {
  constructor() { }

  static parseScramble(scramble: string, moveMap: string) {
    let moveseq = [];
    let moves = scramble.split(/\s+/g);
    let m, w, f, p;

    for (let s = 0, maxs = moves.length; s < maxs; s += 1) {
      m = scrambleReg.exec(moves[s]);

      if (m == null) {
        continue;
      }

      f = "FRUBLDfrubldzxySME".indexOf(m[2]);

      p = -(parseInt(m[5]) || 1) * Math.sign(moves[s].indexOf("'") + 0.2);

      if (f > 14) {
        // p = "2'".indexOf(m[5] || 'X') + 2;
        f = [0, 4, 5][f % 3];
        moveseq.push([moveMap.indexOf("FRUBLD".charAt(f)), 2, p, 1, 0]);
        continue;
      }

      w = f < 12 ? (~~m[1] || ~~m[4] || ((m[3] == "w" || f > 5) && 2) || 1) : -1;
      // p = f < 12 ? turns : -("2'".indexOf(m[5] || 'X') + 2);
      moveseq.push([moveMap.indexOf("FRUBLD".charAt(f % 6)), w, p, 0, (f < 12 ? 0 : 1)]); // Move Index, Face Index, Direction
    }
    return moveseq;
  }

  static parseNNN(scramble: string, order: number) {
    let scr = ScrambleParser.parseNNNString(scramble);

    const MOVE_MAP = "URFDLB";
    let moves = ScrambleParser.parseScramble(scr, MOVE_MAP);
    let res = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      if (!moves[i][4]) {
        res.push([
          moves[i][3] ? order - 1 : moves[i][1], // Face Index
          MOVE_MAP.charAt(moves[i][0]), // Move Index
          moves[i][2], // Direction
          moves[i][3] ? order - 2 : undefined // Span
        ]);
      } else {
        res.push([order, MOVE_MAP.charAt(moves[i][0]), moves[i][2], moves[i][3]]);
      }
    }

    return res;
  }

  static parseMegaminx(scramble: string) {
    let res: number[][] = [];

    // Carrot Notation
    if (scramble.split('\n').filter(e => e).every(e => /^(\s*([+-]{2}|U|U'))*$/.test(e))) {
      let moves = scramble.match(/[+-]{2}|U'?/g);

      if (!moves) {
        return res;
      }

      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        switch (moves[i]) {
          case "U":
            res.push([0, -1, 1]);
            break;
          case "U'":
            res.push([0, 1, 1]);
            break;
          case "++":
          case "+-":
          case "-+":
          case "--":
            res.push([1, 2 * (moves[i][0] == '-' ? -1 : 1), -1]);
            res.push([0, 2 * (moves[i][1] == '-' ? -1 : 1), -1]);
            break;
        }
      }
    } else { // WCA Notation
      let moves = scramble.match(/((DB[RL]\d*'?)|([dbDB][RL]\d*'?)|(\[[ulfrbd]\d*'?\])|([RDrd](\+|-){1,2})|([ULFRBDy]\d*'?))/g) || [];
      let moveMap = "ULFRBD";

      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        let mv = moves[i];

        if (/^([RDrd](\+|-){1,2})$/.test(mv)) {
          let type = mv[0] === 'R' || mv[0] === 'r' ? 1 : 0;
          let turns = mv.indexOf('+') * (mv.length - 1);
          res.push([type, turns, -1, mv[0] === mv[0].toLowerCase() ? 1 : 0]);
        } else {
          let turns = (parseInt(mv.replace(/\D+(\d+)\D*/g, '$1')) || 1) * Math.sign(mv.indexOf("'") + 0.2);

          if (/^([ULFRBDy]\d*'?)$/.test(mv)) {
            if (mv[0] === 'y') {
              res.push([0, turns, 1]);
              res.push([0, turns, -1]);
            } else {
              res.push([moveMap.indexOf(mv[0]), turns, 1]);
            }
          } else if (/^([dbDB][RL]\d*'?)$/.test(mv)) {
            res.push([['dl', 'dr', 'bl', 'br'].indexOf(mv.slice(0, 2).toLowerCase()) + 6, turns, 1]);
          } else if (/^(DB[RL]\d*'?)$/.test(mv)) {
            res.push([['DBL', 'DBR'].indexOf(mv.slice(0, 3)) + 10, turns, 1]);
          } else {
            res.push([moveMap.indexOf(mv[1].toUpperCase()) + 12, turns, -1]);
          }
        }
      }
    }

    return res;
  }

  static parsePyraminx(scramble: string) {
    // MOVE_MAP = "URLB"
    // MV = [ plane, turns, layers, direction ] ]

    let res = [];
    let moveReg = /(([ULRB]w?)|(o?[ULRB])|[urlbdyz])['2]?/g;
    let moves = scramble.match(moveReg);
    let moveMap = "URLB";

    if (!moves) return [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let mv = moves[i];

      let turns = (parseInt(mv.replace(/\D+(\d+)\D*/g, '$1')) || 1) * Math.sign(mv.indexOf("'") + 0.2);

      if (mv.startsWith('o')) {
        res.push([moveMap.indexOf(mv[1]), turns, 0, -1]);
      } else if (/^[yz]$/.test(mv[0])) {
        res.push(["y--z".indexOf(mv[0]), (mv[0] === 'z' ? -1 : 1) * turns, 0, -1]);
      } else if (mv[0] === 'd') {
        res.push([0, -turns, 2, -1]);
      } else {
        let mmv = mv[0].toUpperCase();
        res.push([moveMap.indexOf(mmv), turns, (mv.indexOf('w') > -1 ? 3 : mmv === mv[0] ? 2 : 1), 1]);
      }
    }

    return res;
  }

  static parseSkewb(scramble: string) {
    // MOVE_MAP = "URLB"
    // MV = [ plane, turns ]

    let res = [];
    let moveReg = /[FULRBrlxyz]['2]?/g;
    let moves = scramble.match(moveReg);
    let moveMap = "FURLBrlxyz";

    if (!moves) return [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let mv = moves[i];
      let turns = (parseInt(mv.replace(/\D+(\d+)\D*/g, '$1')) || 1) * Math.sign(mv.indexOf("'") + 0.2);
      res.push([moveMap.indexOf(mv[0]), -turns]);
    }

    return res;
  }

  static parseSquare1(scramble: string) {
    let newScramble = scramble.replace(/\s+/g, '').split('/');
    let sqres = [/^\((-?\d),(-?\d)\)$/, /^(-?\d),(-?\d)$/, /^(-?\d)(-?\d)$/, /^(-?\d)$/];
    let res = [];

    for (let i = 0, maxi = newScramble.length; i < maxi; i += 1) {
      let reg = sqres.find(reg => reg.exec(newScramble[i]));

      if (reg) {
        let m = reg.exec(newScramble[i])!;
        let u = ~~m[1];
        let d = ~~m[2];
        if (u != 0) {
          res.push([1, u]);
        }
        if (d != 0) {
          res.push([2, d]);
        }
      } else if (/^([xyz])2$/.test(newScramble[i])) {
        res.push(["xyz".indexOf(newScramble[i][0]) + 4, 6]);
      }

      if (i != maxi - 1) {
        res.push([0, 6]);
      }
    }
    return res;
  }

  static parseSuperSquare1(scramble: string) {
    let newScramble = scramble.replace(/\s+/g, '').split('/');
    let sqres = /^\((-?\d),(-?\d),(-?\d),(-?\d)\)$/;
    let res = [];

    for (let i = 0, maxi = newScramble.length; i < maxi; i += 1) {
      let m = sqres.exec(newScramble[i]);

      if (m) {
        for (let n = 1; n <= 4; n += 1) {
          let mv = ~~m[n];
          mv && res.push([n, mv]);
        }
      }

      if (i != maxi - 1) {
        res.push([0, 6]);
      }
    }
    return res;
  }

  static parseClock(scramble: string) {
    let parts = scramble.replace('\\n', ' ').split(/\s+/g);
    let res: number[][] = [];

    if (scramble.indexOf('/') > -1) { /// Concise notation
      const pins = [0xc, 0x5, 0x3, 0xa, 0x7, 0xb, 0xe, 0xd, 0xf, 0x0, 0];

      let parts = scramble.replace(/\s+/g, '').split('/');

      if (parts.length != 11) return res;

      const BOTH_REG = /^\((-?\d),(-?\d)\)$/;
      const SINGLE_REG = /^\((-?\d)\)$/;

      for (let i = 0, maxi = parts.length; i < maxi; i += 1) {
        let mv = parts[i];

        if (BOTH_REG.test(mv) && i < 4) {
          let moves = mv.replace(BOTH_REG, '$1 $2').split(" ").map(Number);

          res.push([pins[i], moves[0], 0]);
          res.push([-1, -1, -1]);
          res.push([(i & 1) ? pins[i] : pins[(i + 2) & 3], -moves[1], 0]);
          res.push([-1, -1, -1]);
        } else if (SINGLE_REG.test(mv)) {
          let move = +mv.replace(SINGLE_REG, '$1');

          if (i === 9) {
            res.push([-1, -1, -1]);
            res.push([0xf, -move, 0]);
            res.push([-1, -1, -1]);
          } else {
            res.push([pins[i], move, 0]);
          }
        } else {
          let pin = parseInt(mv.split('').map(s => s === 'U' ? 1 : 0).join(''), 2);
          res.push([pin, NaN, NaN]);
        }
      }

    } else if (!/(u|d)/.test(scramble)) { /// WCA notation
      const letters = ['UL', 'UR', 'DL', 'DR', 'ALL', 'U', 'R', 'D', 'L'];
      const pins = [0x8, 0x4, 0x2, 0x1, 0xf, 0xc, 0x5, 0x3, 0xa];
      const up = 1;

      for (let i = 0, maxi = parts.length; i < maxi; i += 1) {
        if (parts[i] === 'y2') {
          res.push([-1, -1, -1]);
        } else {
          let cmd = [0, 0, 0];
          for (let j = 0, maxj = letters.length; j < maxj; j += 1) {
            if (parts[i].startsWith(letters[j])) {
              let turns = parseInt(parts[i].slice(letters[j].length, letters[j].length + 1));
              if (parts[i].indexOf('-') > -1) {
                turns = -turns;
              }
              cmd[0] = pins[j];
              cmd[up] = turns;
              break;
            }
          }
          if (cmd[1] != 0 || cmd[2] != 0) {
            res.push(cmd);
          }
        }
      }
    } else { /// JAAP notation
      // let pins = '';
      // let d = 0;
      // let u = 0;
      // for (let i = 0, maxi = parts.length; i < maxi; i += 1) {
      //   if ( /\d+/.test(parts[i]) ) {
      //     let turns = parseInt(parts[i].replace('=', '').substr(1, 2));
      //     ( parts[i][0] === 'd' ) ? d = turns : u = turns;
      //   } else {
      //     if ( pins.length === 4 ) {
      //       res.push([ parseInt(pins.replace('U', '1').replace('d', '0'), 2), d, u ]);
      //       d = 0; u = 0; pins = '';
      //     } else {
      //       pins += parts[i];
      //     }
      //   }
      // }

      // if ( pins.length === 4 ) {
      //   res.push([ parseInt(pins.replace('U', '1').replace('d', '0'), 2), d, u ]);
      // }
    }

    return res;
  }

  static parseNNNString(scramble: string): string {
    return (new Interpreter()).input(scramble) as string;
  }

  static parseMisc(scramble: string, mode: string): string[] {
    switch (mode) {
      case 'r3': case 'r3ni': case 'r234w': case 'r2345w': case 'r23456w':
      case 'r234567w': case 'r234': case 'r2345': case 'r23456': case 'r234567': {
        return prettyScramble(scramble).split('\n').map(s => s.replace(/^\d+\)(.+)$/, "$1").trim());
      }

      case 'sq2': case 'gearso': case 'gearo': case 'gear': case 'redi': case 'redim':
      case 'bic': case 'ivy': case 'ivyo': case 'ivyso': case 'prcp': case 'prco':
      case 'heli': case '888': case '999': case '101010': case '111111': case 'mpyr':
      case '223': case '233': case '334': case '336': case 'ssq1t': {
        return [scramble];
      }

      default: {
        return [];
      }
    }
  }
}
