/**
 * Isaac Vega Rodriguez (isaacvega1996@gmail.com)
 * Advanced scramble parser for NxNxN cubes
 * 
 * NOTE: Recursive approach can be dangerous.
 * Consider to use stacks or another non-recursive approach.
 */

/**
 * Tokenizer spec.
 */
interface Token {
  type: string | RegExp;
  value: any;
}

const Spec = [
  // Whitespaces:
  [ /^\s+/, null ],
  [ /^\n/, null ],
  [ /^\r/, null ],
  [ /^\./, null ],

  // Comments:
  [ /^\/\/.*/, null ],

  // Conmutator separator:
  [ /^,/, ',' ],

  // Symbols-delimiters:
  [ /^\(/, '(' ],
  [ /^\)([1-9]\d{0,1})?/, ')' ],
  [ /^\[/, '[' ],
  [ /^\]([1-9]\d{0,1})?/, ']' ],

  // Move:
  [ /^([\d]+)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?('|2'|2)?/, 'MOVE' ],
];

class Tokenizer {
  private _string: string;
  private _cursor: number;

  init(string) {
    this._string = string;
    this._cursor = 0;
  }

  hasMoreTokens() {
    return this._cursor < this._string.length;
  }

  isEOF() {
    return this._cursor === this._string.length;
  }
    
  getNextToken(): Token {
    if ( !this.hasMoreTokens() ) {
      return null;
    }

    const string = this._string.slice(this._cursor);
    
    for (const [ regexp, tokenType ] of Spec) {
      let tokenValue = this._match(regexp, string);

      if ( tokenValue == null ) continue;
      if ( tokenType == null ) return this.getNextToken();

      return { type: tokenType, value: tokenValue };
    }
   
    throw new SyntaxError(`Unexpected token: ${string[0]}`);
  }

  _match(regexp, string) {
    const matched = regexp.exec(string);
    if ( matched == null ) {
      return null;
    }
    this._cursor += matched[0].length;
    return matched[0];
  }

}

class Solver {
  constructor() {
  }

  invert(seq: string[]): string[] {
    let res: string[] = [];
    for (let i = seq.length - 1; i >= 0; i -= 1) {
      if ( seq[i].indexOf('2') > -1 ) {
        res.push( seq[i].replace("'", "") );
      } else if ( seq[i].indexOf("'") > -1 ) {
        res.push( seq[i].replace("'", "") );
      } else {
        res.push( seq[i] + "'" );
      }
    }
    return res;
  }

  simplify(seq: string[]): string[] {
    let mp = new Map<number, string>();
    let mp1 = new Map<string, number>();
    mp.set(-3, ""); mp.set(-2, "2"); mp.set(-1, "'"); mp.set(1, ""); mp.set(2, "2"); mp.set(3, "'");
    mp1.set("2", -2); mp1.set("'", -1); mp1.set("", 1); mp1.set("2", 2);

    let s1 = seq.map(s => {
      let p: any = s.replace(/^(\d*)([a-zA-Z]+)(['2]?)$/, '$1$2 $3').split(" ");
      return [p[0], mp1.get(p[1])];
    });

    for(let i = 1, maxi = s1.length; i < maxi; i += 1) {
      if ( s1[i][0] === s1[i-1][0] ) {
        s1[i - 1][1] = (s1[i - 1][1] + s1[i][1]) % 4;
        s1.splice(i, 1);
        i--; maxi--;
      }
    }

    return s1.filter(p => p[1]).map(p => p[0] + mp.get(p[1]));
  }

  solve(ast: Token) {
    switch(ast.type) {
      case 'Program':
        return this.simplify( this.solve(ast.value) ).join(" ");
      case 'Expression':
        return ast.value.map(e => this.solve(e)).reduce((acc, e) => [...acc, ...e], []);
      case 'Sequence':
        return ast.value.map(t => t.value);
      case 'ParentesizedExpression':
        let seq = this.solve(ast.value.expr);
        let res = [];
        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [ ...res, ...seq ];
        }
        return res;
      case 'ConmutatorExpression': {
        let s1 = this.solve(ast.value.expr1);
        let s2 = this.solve(ast.value.expr2);
        let s1i = this.invert(s1);
        let s2i = this.invert(s2);
        let seq = [...s1, ...s2, ...s1i, ...s2i];
        let res = [];
        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [ ...res, ...seq ];
        }
        return res;
      }
      default:
        throw new SyntaxError(`Unexpected type: "${ ast.type }"`);
    }
  }
}

export class Interpreter {
  private _tokenizer: Tokenizer;
  private _solver: Solver;
  private _lookahead: Token;

  constructor() {
    this._tokenizer = new Tokenizer();
    this._solver = new Solver();
    this._lookahead = null;
  }

  input(string: string) {
    this._tokenizer.init(string.replaceAll("’", "'"));
    this._lookahead = this._tokenizer.getNextToken();

    let pr = this.Program();

    if ( this._lookahead ) {
      throw new SyntaxError(`Missing operators`);
    }

    return this._solver.solve(pr);
  }

  /**
   * Program
   * ; Expression
   * 
   * This is util only for converting the last sequence to string
   */
  Program(): Token {
    return { type: 'Program', value: this.Expression() };
  }

  /**
   * Expression
   *  ; Sequence
   *  ; ParentesizedExpression
   *  ; CommutatorExpression
   *  ;
   */
  Expression(): Token {
    if ( !this._lookahead ) return { type: 'Expression', value: [] };

    let moves = [];

    while( this._lookahead ) {
      switch(this._lookahead.type) {
        case 'MOVE': { moves.push( this.Sequence() );               break; }
        case '(':    { moves.push( this.ParentesizedExpression() ); break; }
        case '[':    { moves.push( this.ConmutatorExpression() );   break; }
        default: return moves.length === 1 ? moves[0] : { type: 'Expression', value: moves };
      }
    }

    return moves.length === 1 ? moves[0] : { type: 'Expression', value: moves };
  }

  /**
   * ParentesizedExpression
   *  ; '(' Expression ')'
   */
  ParentesizedExpression(): Token {
    this._eat('(');
    let expr = this.Expression();
    let cant = +this._eat(')').value.slice(1) || 1;
    return { type: 'ParentesizedExpression', value: { expr, cant }};
  }

  /**
   * ConmutatorExpression
   *  ; '[' Expression ',' Expression ']'
   */
  ConmutatorExpression(): Token {
    this._eat('[');
    let expr1 = this.Expression();
    this._eat(',');
    let expr2 = this.Expression();
    let cant = +this._eat(']').value.slice(1) || 1;
    return { type: 'ConmutatorExpression', value: { expr1, expr2, cant } };
  }

  /**
   * Sequence
   */
  Sequence(): Token {
    let seq: Token[] = [];
    while( this._lookahead && this._lookahead.type === 'MOVE' ) seq.push( this.Move() );
    return { type: 'Sequence', value: seq};
  }

  /**
   * Move
   *  ; MOVE
   */
  Move(): Token {
    const token = this._eat("MOVE");
    return { type: "Move", value: token.value };
  }

  _eat(tokenType: any, tokenValue ?: any) {
    const token = this._lookahead;

    if ( token == null ) {
      throw new SyntaxError( `Unexpected end of input, expected: ${tokenType}` );
    }

    if ( token.type != tokenType ) {
      throw new SyntaxError( `Unexpected token: ${token.type}, expected: ${tokenType}` );
    }

    if ( tokenValue && token.value != tokenValue ) {
      throw new SyntaxError( `Error, expected "${tokenValue}" but got "${token.value}"` );
    }

    this._lookahead = this._tokenizer.getNextToken();
    
    return token;
  }
}