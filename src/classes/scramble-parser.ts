import { max } from "rxjs/operators";

const scrambleReg = /^([\d]+)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?([2'])?$/;

export class ScrambleParser {
  constructor() {}  

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
      
			if (f > 14) {
				p = "2'".indexOf(m[5] || 'X') + 2;
				f = [0, 4, 5][f % 3];
				moveseq.push([moveMap.indexOf("FRUBLD".charAt(f)), 2, p]);
				moveseq.push([moveMap.indexOf("FRUBLD".charAt(f)), 1, 4-p]);
				continue;
			}
			w = f < 12 ? (~~m[1] || ~~m[4] || ((m[3] == "w" || f > 5) && 2) || 1) : -1;
			p = (f < 12 ? 1 : -1) * ("2'".indexOf(m[5] || 'X') + 2);
			moveseq.push([moveMap.indexOf("FRUBLD".charAt(f % 6)), w, p]);
		}
		return moveseq;
	}

  static parseNNN(scramble: string, order: number) {
    const MOVE_MAP = "URFDLB";
    let moves = ScrambleParser.parseScramble(scramble, MOVE_MAP);
    let res = [];
    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      if (moves[i][1] > 0) {
        res.push([moves[i][1], MOVE_MAP.charAt(moves[i][0]), [1, 2, -1][moves[i][2] - 1]]);
      } else {
        res.push([order, MOVE_MAP.charAt(moves[i][0]), [1, 2, -1][-moves[i][2] - 1]]);
      }
    }
    return res;
  }

  static parseMegaminx(scramble: string) {
    let res = [];
    
    if ( !/R|D/.test(scramble) ) {
      // console.info('Carrot Notation');
      let moves = scramble.match(/[+-]{2}|U'?/g);
      
      if ( !moves ) {
        return res;
      }

      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        switch(moves[i]) {
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
    } else if ( /(\+\+|\-\-)/.test(scramble) ) {
      // console.info('Pochmann');
      let moves = scramble.match(/[RD](?:\+\+|--)|U'?/g);
      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        switch (moves[i]) {
          case "R++":
            res.push([1, 2, -1]);
            break;
          case "R--":
            res.push([1, -2, -1]);
            break;
          case "D++":
            res.push([0, 2, -1]);
            break;
          case "D--":
            res.push([0, -2, -1]);
            break;
          case "U":
            res.push([0, -1, 1]);
            break;
          case "U'":
            res.push([0, 1, 1]);
            break;
        }
      }
    } else {
      // console.info('Old style');
    }
    return res;
  }

  static parsePyraminx(scramble: string) {
    let moves = ScrambleParser.parseScramble(scramble, 'URLB');
    let res = [];
    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      res.push([moves[i][0], moves[i][2] - 2, -3, moves[i][1]]);
    }
    return res;
  }

  static parseSkewb(scramble: string) {
    let moves = ScrambleParser.parseScramble(scramble, "URLB");    
    let res = [];
    for (let i = 0, maxi = moves.length; i < maxi; i++) {
      res.push([moves[i][0], moves[i][2] - 2]);
    }
    return res;
  }

  static parseSquare1(scramble: string) {
    let newScramble = scramble.replace(/\s+/g, '').split('/');
    let sqre = /\s*\(?(-?\d+), *(-?\d+)\)?\s*/;
    let res = [];

    for (let i = 0, maxi = newScramble.length; i < maxi; i += 1) {
      let m = sqre.exec(newScramble[i]);
      if (m) {
        let u = ~~m[1];
        let d = ~~m[2];
        if (u != 0) {
          res.push([1, u]);
        }
        if (d != 0) {
          res.push([2, d]);
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
    let res = [];
    if ( scramble.indexOf('/') > -1 ) { /// Concise notation
      // let parts = scramble.split('/');
      // console.info('Concise notation not implemented yet!');
    } else if ( !/(u|d)/.test(scramble) ) { /// WCA notation
      let letters = [ 'UL', 'UR', 'DL', 'DR', 'ALL', 'U', 'R', 'D', 'L' ];
      let pins = [ 0x8, 0x4, 0x2, 0x1, 0xf, 0xc, 0x5, 0x3, 0xa ];
      let up = 1;
      for (let i = 0, maxi = parts.length; i < maxi; i += 1) {
        if ( parts[i] === 'y2' ) {
          res.push([-1, -1, -1]);
        } else {
          let cmd = [0, 0, 0];
          for (let j = 0, maxj = letters.length; j < maxj; j += 1) {
            if ( parts[i].startsWith(letters[j]) ) {
              let turns = parseInt(parts[i].substr(letters[j].length, 1));
              if ( parts[i].indexOf('-') > -1 ) {
                turns = -turns;
              }
              cmd[0] = pins[j];
              cmd[ up ] = turns;
              break;
            }
          }
          if ( cmd[1] != 0 || cmd[2] != 0 ) {
            res.push(cmd);
          }
        }
      }
    } else { /// JAAP notation
      // console.info('JAAP notation not implemented yet!');
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

}
