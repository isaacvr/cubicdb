const MOVE_REG = /^[RLUDFB]['2]?$/;

export class AlgorithmSequence {
  scramble: string[];
  recovery: string[];
  cursor: number;
  private temp: string;

  constructor(s: string) {
    this.scramble = s.split(' ').filter(m => MOVE_REG.test(m));
    this.recovery = [];
    this.cursor = 0;
    this.temp = '';
  }

  // feed(move: string) {
  //   if ( !MOVE_REG.test(move) ) return;
  //   if ( this.cursor >= this.scramble.length ) return;

  //   let m = this.scramble[ this.cursor ];

  //   if ( this.temp && this.temp[0] != move[0] ) {
  //     this.recovery.unshift( move );
  //     return;
  //   }
  
  //   if ( m.length === 2 && m[1] === '2' ) {
  //     if ( m[0] != move[0] ) {
  //       this.recovery.unshift( move );
  //       return;
  //     }

  //     if ( !this.temp ) {
  //       this.temp = move;
  //     } else {
  //       this.temp = '';
  //       this.cursor += 1;
  //     }

  //     return;
  //   }

  //   if ( m === move ) {
  //     this.cursor += 1;
  //   } else {
  //     this.recovery.unshift( move );
  //   }
  // }
}