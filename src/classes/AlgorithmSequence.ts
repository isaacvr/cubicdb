import { Puzzle } from "./puzzle/puzzle";

const MOVE_REG = /^[RLUDFB]['2]?$/;
const RECOVERY_MAX_LENGTH = 5;

function getMoveParts(move: string) {
  return {
    move: move[0],
    dir: move.endsWith("'") ? -1 : move.endsWith("2") ? 2 : 1
  };
}

export class AlgorithmSequence {
  scramble: string[];
  recovery: string[];
  cursor: number;
  // private temp: string;

  constructor(s?: string) {
    this.scramble = [];
    this.recovery = [];
    this.cursor = 0;
    // this.temp = '';

    this.setScramble(s || '');
  }

  setScramble(s: string) {
    this.cursor = 0;
    this.recovery.length = 0;
    return this.scramble = (s || '').split(/\s+/g).filter(m => MOVE_REG.test(m));
  }

  getRecoveryScramble(): string {
    if ( this.cursor >= this.scramble.length || this.recovery.length === 0 ) return '';
    if ( this.recovery.length === 1 && this.recovery[0][0] === this.scramble[ this.cursor ][0][0] ) return '';
    return Puzzle.inverse("rubik", this.recovery.slice().reverse().join(" "));
  }

  clear() {
    this.setScramble('');
    this.cursor = this.recovery.length = 0;
    // this.temp = '';
  }

  feed(move: string): boolean {
    if ( !MOVE_REG.test(move) ) return false;
    if ( this.cursor >= this.scramble.length ) return false;

    let m = this.scramble[ this.cursor ];

    if ( m === move ) {
      this.cursor += 1;
      return true;
    }

    if ( this.beyondScramble() ) {
      return false;
    }

    let mdata = getMoveParts( move );
    let moveMap = "URFDLB";
    let index = (l: string) => moveMap.indexOf(l);
    let discardTopRecovery = () => {
      while ( this.recovery.length && this.recovery[0] === this.scramble[ this.cursor ] ) {
        this.recovery.shift();
        this.cursor += 1;
      }
    };

    for (let i = 0, maxi = this.recovery.length; i < maxi; i += 1) {
      let rdata = getMoveParts(this.recovery[i]);

      if ( rdata.move === mdata.move ) {
        let res = (rdata.dir + mdata.dir + 4) & 3;

        if ( res === 0 ) {
          this.recovery.splice(i, 1);
          discardTopRecovery();
          return true;
        }

        this.recovery[i] = rdata.move + ["", "", "2", "'"][res];
        discardTopRecovery();
        return true;
      }

      if ( index(this.recovery[i][0]) % 3 === index( mdata.move ) % 3 ) {
        continue;
      }

      break;
    }
    
    this.recovery.unshift(move);
    return true;
  }

  beyondScramble(): boolean {
    return this.recovery.length >= RECOVERY_MAX_LENGTH;
  }

  done(): boolean {
    return this.cursor >= this.scramble.length && this.recovery.length === 0;
  }
}