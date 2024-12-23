import { Puzzle } from "./puzzle/puzzle";

const MOVE_REG = /^[RLUDFB]['2]?$/;
const RECOVERY_MAX_LENGTH = 10;

function getMoveParts(move: string) {
  return {
    move: move[0],
    dir: move.endsWith("'") ? -1 : move.endsWith("2") ? 2 : 1,
  };
}

export class AlgorithmSequence {
  scramble: string[];
  recovery: string[];
  cursor: number;

  constructor(s?: string) {
    this.scramble = [];
    this.recovery = [];
    this.cursor = 0;

    this.setScramble(s || "");
  }

  setScramble(s: string) {
    this.cursor = 0;
    this.recovery.length = 0;
    return (this.scramble = (s || "").split(/\s+/g).filter(m => MOVE_REG.test(m)));
  }

  getRecoveryScramble(): string {
    if (this.cursor >= this.scramble.length || this.recovery.length === 0) return "";
    if (this.recovery.length === 1 && this.recovery[0][0] === this.scramble[this.cursor][0][0])
      return "";
    return Puzzle.inverse("rubik", this.recovery.slice().reverse().join(" "));
  }

  clear() {
    this.setScramble("");
    this.cursor = this.recovery.length = 0;
  }

  feed(move: string): boolean {
    if (!MOVE_REG.test(move)) return false;
    if (this.cursor >= this.scramble.length) return false;

    const m = this.scramble[this.cursor];

    // Incoming move is the current one on the scramble
    if (m === move && this.recovery.length === 0) {
      this.cursor += 1;
      return true;
    }

    // On your own
    if (this.beyondScramble()) {
      return false;
    }

    const mdata = getMoveParts(move);
    const moveMap = "URFDLB";
    const index = (l: string) => moveMap.indexOf(l);
    const discardTopRecovery = () => {
      while (this.recovery.length && this.recovery[0] === this.scramble[this.cursor]) {
        this.recovery.shift();
        this.cursor += 1;
      }
    };

    let isParallel = false,
      lasti = -1;

    for (let i = 0, maxi = this.recovery.length; i < maxi; i += 1) {
      const rdata = getMoveParts(this.recovery[i]);

      if (rdata.move === mdata.move) {
        const res = (rdata.dir + mdata.dir + 4) & 3;

        if (res === 0) {
          this.recovery.splice(i, 1);
          discardTopRecovery();
          return true;
        }

        this.recovery[i] = rdata.move + ["", "", "2", "'"][res];
        discardTopRecovery();
        return true;
      }

      if (index(this.recovery[i][0]) % 3 === index(mdata.move) % 3) {
        lasti = i;
        isParallel = true;
        continue;
      }

      break;
    }

    if (isParallel && lasti === this.recovery.length - 1 && m === move) {
      this.cursor += 1;
      discardTopRecovery();
    } else {
      this.recovery.unshift(move);
    }

    return true;
  }

  beyondScramble(): boolean {
    return this.recovery.length >= RECOVERY_MAX_LENGTH;
  }

  done(): boolean {
    return this.cursor >= this.scramble.length && this.recovery.length === 0;
  }
}
