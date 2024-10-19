/**
 * Isaac Vega Rodriguez (isaacvega1996@gmail.com)
 * Advanced scramble parser for NxNxN cubes
 *
 * NOTE: Recursive approach can be dangerous.
 * Consider to use stacks or another non-recursive approach.
 */

import { clone } from "@helpers/object";
import type { PuzzleType } from "@interfaces";
import { Puzzle } from "./puzzle/puzzle";

/**
 * Tokenizer specs.
 */
const RubikSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],
  [/^\./, null],

  // Comments:
  [/^\/\/.*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // Symbols-delimiters:
  [/^\(/, "("],
  [/^\)([1-9]\d{0,1})?/, ")"],
  [/^\[/, "["],
  [/^\]([1-9]\d{0,1})?/, "]"],

  // Move:
  [/^([\d]+)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?('|2'|2|3'|3)?/, "MOVE"],
] as const;

const SquareOneSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],

  // Comments:
  [/^-[^\d].*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // Move:
  [/^\//, "MOVE"],
  [/^\(\s*(-?\d),\s*(-?\d)\s*\)/, "MOVE"],
  [/^(-?\d),\s*(-?\d)/, "MOVE"],
  [/^(-?\d)(-?\d)/, "MOVE"],
  [/^(-?\d)/, "MOVE"],
  [/^([xyz])2/, "MOVE"],
] as const;

const MegaminxSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],

  // Comments:
  [/^\/\/.*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // /((DB[RL]\d*'?)|([dbDB][RL]\d*'?)|(\[[ulfrbd]\d*'?\])|([RDrd](\+|-){1,2})|([ULFRBDy]\d*'?))/g

  // Move:
  [/^DB[RL]\d*'?/, "MOVE"], // Single moves back side
  [/^[dbDB][RL]\d*'?/, "MOVE"], // Side faces move
  [/^\[[ulfrbd]\d*'?\]/, "MOVE"], // Rotation moves
  [/^[LRDlrd](\+|-){1,2}/, "MOVE"], // WCA moves
  [/^[ULFRBDy]\d*'?/, "MOVE"], // Single moves

  // Symbols-delimiters:
  [/^\(/, "("],
  [/^\)([1-9]\d{0,1})?/, ")"],
  [/^\[/, "["],
  [/^\]([1-9]\d{0,1})?/, "]"],
] as const;

const PyraminxSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],
  [/^\./, null],

  // Comments:
  [/^\/\/.*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // Symbols-delimiters:
  [/^\(/, "("],
  [/^\)([1-9]\d{0,1})?/, ")"],
  [/^\[/, "["],
  [/^\]([1-9]\d{0,1})?/, "]"],

  // Moves
  [/^(([ULRB]w?)|(o?[ULRB])|[urlbdyz])['2]?/, "MOVE"],
] as const;

const HelicopterSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],
  [/^\./, null],

  // Comments:
  [/^\/\/.*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // Symbols-delimiters:
  [/^\(/, "("],
  [/^\)([1-9]\d{0,1})?/, ")"],
  [/^\[/, "["],
  [/^\]([1-9]\d{0,1})?/, "]"],

  // Moves
  [/^(UR|UF|UL|UB|DR|DF|DL|DB|FR|FL|BL|BR)/, "MOVE"],
] as const;

const ClockSpec = [
  // Whitespaces:
  [/^[\s\n\r\t]+/, "SPACE"],
  [/^\./, null],

  // Comments:
  [/^\/\/.*/, "COMMENT"],

  // Conmutator separator:
  [/^,/, ","],
  [/^:/, ":"],

  // Symbols-delimiters:
  [/^\(/, "("],
  [/^\)([1-9]\d{0,1})?/, ")"],
  [/^\[/, "["],
  [/^\]([1-9]\d{0,1})?/, "]"],

  // Moves

  // WCA
  [
    /^((UR|DR|DL|UL|ur|dr|dl|ul|R|D|L|U|ALL|\/|\\)(\(\d[+-],\s*\d[+-]\)|\d[+-])|y2|x2|z[2']?|UR|DR|DL|UL)/,
    "MOVE",
  ],

  // Jaap
  [/^[Ud]{2}\s+([ud]=?[+-]?\d\s+)*[Ud]{2}(\s+[ud]=?[+-]?\d)*/, "MOVE"],
] as const;

type InterpreterNode =
  | "Program"
  | "Expression"
  | "Space"
  | "Comment"
  | "ParentesizedExpression"
  | "ConmutatorExpression"
  | "Move";

interface TToken {
  type: (typeof RubikSpec)[number][1];
  value: any;
}

interface IToken {
  type: InterpreterNode | RegExp;
  value: any;
  cursor: number;
}

interface Tokenizer {
  getCursor: () => number;
  init: (s: string) => any;
  hasMoreTokens: () => boolean;
  isEOF: () => boolean;
  getNextToken: () => TToken | null;
  _match: (r: RegExp, s: string) => string | null;
}

const SpecMap: any = {
  rubik: RubikSpec,
  square1: SquareOneSpec,
  megaminx: MegaminxSpec,
  pyraminx: PyraminxSpec,
  helicopter: HelicopterSpec,
  clock: ClockSpec,
};

class BaseTokenizer implements Tokenizer {
  private _string: string = "";
  private _cursor: number = 0;
  private throwErrors: boolean;
  private spec: typeof RubikSpec;

  constructor(throwErrors = true, puzzle: PuzzleType) {
    this.throwErrors = throwErrors;
    this.spec = puzzle in SpecMap ? SpecMap[puzzle] : RubikSpec;
  }

  private _throwCursor() {
    if (!this.throwErrors) {
      throw this.getCursor();
    }
  }

  getCursor() {
    return this._cursor;
  }

  init(string: string) {
    this._string = string;
    this._cursor = 0;
  }

  hasMoreTokens() {
    return this._cursor < this._string.length;
  }

  isEOF() {
    return this._cursor === this._string.length;
  }

  getNextToken(): TToken | null {
    if (!this.hasMoreTokens()) {
      return null;
    }

    const string = this._string.slice(this._cursor);

    for (const [regexp, tokenType] of this.spec) {
      let tokenValue = this._match(regexp, string);

      if (tokenValue == null) continue;
      if (tokenType == null) return this.getNextToken();

      return { type: tokenType, value: tokenValue };
    }

    this._throwCursor();
    throw new SyntaxError(`Unexpected token: ${string[0]}`);
  }

  _match(regexp: RegExp, string: string) {
    const matched = regexp.exec(string);
    if (matched == null) {
      return null;
    }
    this._cursor += matched[0].length;
    return matched[0];
  }
}

class Solver {
  tokenizerType: PuzzleType;

  constructor(tokenizerType: PuzzleType) {
    this.tokenizerType = tokenizerType;
  }

  invert(seq: string[]): string[] {
    return seq.map(s => Puzzle.inverse(this.tokenizerType, s));
  }

  invertFlat(seq: IToken[]): IToken[] {
    let res: IToken[] = [];

    for (let i = seq.length - 1; i >= 0; i -= 1) {
      if (seq[i].type === "Move") {
        let cp = clone(seq[i]) as IToken;
        cp.value = Puzzle.inverse(this.tokenizerType, cp.value);
        res.push(cp);
      } else {
        res.push(seq[i]);
      }
    }

    return res;
  }

  simplify(seq: string[]): string[] {
    let mp = new Map<number, string>();
    let mp1 = new Map<string, number>();
    mp.set(-3, "");
    mp.set(-2, "2");
    mp.set(-1, "'");
    mp.set(1, "");
    mp.set(2, "2");
    mp.set(3, "'");
    mp1.set("2", -2);
    mp1.set("'", -1);
    mp1.set("", 1);
    mp1.set("2", 2);
    mp1.set("2'", 2);
    mp1.set("3", -1);
    mp1.set("3'", 1);

    let s1 = seq.map(s => {
      let p: any = s.replace(/^(\d*)([a-zA-Z]+)('|2'|2|3'|3)?$/, "$1$2 $3").split(" ");
      return [p[0], mp1.get(p[1])];
    });

    for (let i = 1, maxi = s1.length; i < maxi; i += 1) {
      if (s1[i][0] === s1[i - 1][0]) {
        s1[i - 1][1] = (s1[i - 1][1] + s1[i][1]) % 4;
        s1.splice(i, 1);
        i--;
        maxi--;
      }
    }

    return s1.filter(p => p[1]).map(p => p[0] + mp.get(p[1]));
  }

  solve(ast: IToken, simplify = true): string | string[] {
    switch (ast.type) {
      case "Program":
        return (simplify ? this.simplify : (e: any) => e)(
          this.solve(ast.value, simplify) as string[]
        ).join(" ");
      case "Expression":
        return ast.value
          .map((e: IToken) => this.solve(e, simplify))
          .reduce((acc: string[], e: string) => [...acc, ...e], []);
      case "Space":
      case "Comment":
        return [];
      case "Move":
        return [ast.value];
      case "ParentesizedExpression":
        let seq = this.solve(ast.value.expr, simplify);
        let res: string[] = [];
        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [...res, ...seq];
        }
        return res;
      case "ConmutatorExpression": {
        let seq;

        if (ast.value.setup) {
          let setup = this.solve(ast.value.setup, simplify);
          let conmutator = this.solve(ast.value.conmutator, simplify);
          let setupInv = this.invert(setup as string[]);
          seq = [...setup, ...conmutator, ...setupInv];
        } else {
          let s1 = this.solve(ast.value.expr1, simplify);
          let s2 = this.solve(ast.value.expr2, simplify);
          let s1i = this.invert(s1 as string[]);
          let s2i = this.invert(s2 as string[]);
          seq = [...s1, ...s2, ...s1i, ...s2i];
        }

        let res: string[] = [];

        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [...res, ...seq];
        }
        return res;
      }
      default: {
        throw new SyntaxError(`Unexpected type: "${ast.type}"`);
      }
    }
  }

  flat(ast: IToken): IToken[] {
    switch (ast.type) {
      case "Program":
        return this.flat(ast.value);
      case "Expression":
        return ast.value
          .map((e: IToken) => this.flat(e))
          .reduce((acc: string[], e: string) => [...acc, ...e], []);
      case "Space":
      case "Comment":
        return [ast];
      case "Move":
        return [ast];
      case "ParentesizedExpression":
        let seq = this.flat(ast.value.expr);
        let res: IToken[] = [];

        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [...res, ...seq];
        }

        return res;
      case "ConmutatorExpression": {
        let seq: IToken[];

        if (ast.value.setup) {
          let setup = this.flat(ast.value.setup);
          let conmutator = this.flat(ast.value.conmutator);
          let setupInv = this.invertFlat(setup);
          seq = [...setup, ...conmutator, ...setupInv];
        } else {
          let s1 = this.flat(ast.value.expr1);
          let s2 = this.flat(ast.value.expr2);
          let s1i = this.invertFlat(s1 as IToken[]);
          let s2i = this.invertFlat(s2 as IToken[]);
          seq = [...s1, ...s2, ...s1i, ...s2i];
        }

        let res: IToken[] = [];

        for (let i = 1, maxi = ast.value.cant; i <= maxi; i += 1) {
          res = [...res, ...seq];
        }
        return res;
      }
      default: {
        throw new SyntaxError(`Unexpected type: "${ast.type}"`);
      }
    }
  }
}

export class Interpreter {
  private _tokenizer: Tokenizer;
  private _solver: Solver;
  private _lookahead: TToken | null;
  private throwErrors: boolean;
  private moveCursor: number = 0;

  constructor(throwErrors: boolean = true, tokenizerType: PuzzleType = "rubik") {
    this._tokenizer = new BaseTokenizer(throwErrors, tokenizerType);
    this._solver = new Solver(tokenizerType);
    this._lookahead = null;
    this.throwErrors = throwErrors;
  }

  input(string: string, simplify = true) {
    this._tokenizer.init(string.replaceAll("’", "'"));
    this._lookahead = this._tokenizer.getNextToken();

    let pr = this.Program();

    if (this._lookahead) {
      throw new SyntaxError(`Missing operators`);
    }

    return this._solver.solve(pr, simplify);
  }

  getTree(string: string): { error: boolean | null; cursor: any; program: IToken } {
    let pr;

    try {
      this._tokenizer.init(string.replaceAll("’", "'"));
      this._lookahead = this._tokenizer.getNextToken();

      pr = this.Program();

      if (this._lookahead) {
        return {
          error: true,
          cursor: this._tokenizer.getCursor(),
          program: pr,
        };
      }
    } catch (cur) {
      return {
        error: true,
        cursor: cur,
        program: {
          type: "Program",
          value: { type: "Expression", value: [], cursor: -1 } as IToken,
          cursor: -1,
        },
      };
    }

    return {
      error: null,
      cursor: -1,
      program: pr,
    };
  }

  getFlat(program: IToken): IToken[] {
    return this._solver.flat(program);
  }

  /**
   * Program
   * ; Expression
   *
   * This is util only for converting the last sequence to string
   */
  Program(): IToken {
    return { type: "Program", value: this.Expression(), cursor: -1 };
  }

  /**
   * Expression
   *  ; Move
   *  ; Space
   *  ; Comment
   *  ; ParentesizedExpression
   *  ; CommutatorExpression
   *  ;
   */
  Expression(): IToken {
    if (!this._lookahead) return { type: "Expression", value: [], cursor: -1 };

    let moves: IToken[] = [];

    while (this._lookahead) {
      switch (this._lookahead.type) {
        case "MOVE": {
          moves.push(this.Move());
          break;
        }
        case "SPACE": {
          moves.push(this.Space());
          break;
        }
        case "COMMENT": {
          moves.push(this.Comment());
          break;
        }
        case "(": {
          moves.push(this.ParentesizedExpression());
          break;
        }
        case "[": {
          moves.push(this.ConmutatorExpression());
          break;
        }
        default:
          return moves.length === 1 ? moves[0] : { type: "Expression", value: moves, cursor: -1 };
      }
    }

    return moves.length === 1 ? moves[0] : { type: "Expression", value: moves, cursor: -1 };
  }

  /**
   * Space
   *  ; " "
   */
  Space(): IToken {
    return { type: "Space", value: this._eat("SPACE").value, cursor: -1 };
  }

  /**
   * Comment
   *  ; " "
   */
  Comment(): IToken {
    return { type: "Comment", value: this._eat("COMMENT").value, cursor: -1 };
  }

  /**
   * ParentesizedExpression
   *  ; '(' Expression ')'
   */
  ParentesizedExpression(): IToken {
    this._eat("(");
    let expr = this.Expression();
    let n = +this._eat(")").value.slice(1);
    let cant = n || 1;
    return { type: "ParentesizedExpression", value: { expr, cant, explicit: !!n }, cursor: -1 };
  }

  /**
   * ConmutatorExpression
   *  ; '[' Expression ',' Expression ']'
   */
  ConmutatorExpression(): IToken {
    this._eat("[");
    let expr1 = this.Expression();

    if (this._lookahead?.type === ":") {
      this._eat(":");

      let conmutator = this.Expression();
      let n = +this._eat("]").value.slice(1);
      let cant = n || 1;
      return {
        type: "ConmutatorExpression",
        value: { setup: expr1, conmutator, cant, explicit: !!n },
        cursor: -1,
      };
    }

    this._eat(",");
    let expr2 = this.Expression();
    let n = +this._eat("]").value.slice(1);
    let cant = n || 1;
    return {
      type: "ConmutatorExpression",
      value: { expr1, expr2, cant, explicit: !!n },
      cursor: -1,
    };
  }

  /**
   * Move
   *  ; MOVE
   */
  Move(): IToken {
    const token = this._eat("MOVE");
    return { type: "Move", value: token.value, cursor: this.moveCursor++ };
  }

  private _throwCursor() {
    if (!this.throwErrors) {
      throw this._tokenizer.getCursor();
    }
  }

  _eat(tokenType: any, tokenValue?: any) {
    let token = this._lookahead;

    if (token == null) {
      this._throwCursor();
      throw new SyntaxError(`Unexpected end of input, expected: ${tokenType}`);
    }

    if (token.type != tokenType) {
      this._throwCursor();
      throw new SyntaxError(`Unexpected token: ${token.type}, expected: ${tokenType}`);
    }

    if (tokenValue && token.value != tokenValue) {
      this._throwCursor();
      throw new SyntaxError(`Error, expected "${tokenValue}" but got "${token.value}"`);
    }

    this._lookahead = this._tokenizer.getNextToken();

    return token;
  }
}
