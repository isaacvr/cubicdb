import { gSolver } from "@cstimer/lib/mathlib";
import { adjustScramble } from "./utils";

export function square1Solver(scramble: string): string[][] {
  let moves: Record<string, number> = { "0": 0x21 };
  let curScramble: number[] = [];
  // let sol

  for (let m = 1; m < 12; m += 1) {
    moves["" + m] = 0x00;
    moves["" + -m] = 0x10;
  }

  function stateInit(doMove: Function, state: string) {
    for (let i = 0; i < curScramble.length; i += 1) {
      state = doMove(state, curScramble[i]);
    }
    
    return state;
  }

  function sq1Move(state: string, move: string) {
    if (!state) {
      return null;
    }
    let mv = ~~move;
    let st = state.split("|");

    if (mv == 0) {
      let tmp = st[0].slice(6);
      st[0] = st[0].slice(0, 6) + st[1].slice(6);
      st[1] = st[1].slice(0, 6) + tmp;
    } else {
      let idx = mv > 0 ? 0 : 1;
      mv = Math.abs(mv);
      st[idx] = st[idx].slice(mv) + st[idx].slice(0, mv);
      if (/[a-h]/.exec(st[idx][0] + st[idx][6])) {
        return null;
      }
    }
    return st.join("|");
  }

  function prettySq1Arr(sol: string[]) {
    let u = 0;
    let d = 0;
    let ret = [];
    for (let i = 0; i < sol.length; i += 1) {
      if (+sol[i] == 0) {
        if (u == 0 && d == 0) {
          ret.push("/");
        } else {
          ret.push("("  + (((u + 5) % 12) - 5) + ", " + (((d + 5) % 12) - 5) + ") /");
        }
        u = d = 0;
      } else if (+sol[i] > 0) {
        u += ~~sol[i];
      } else {
        d -= ~~sol[i];
      }
    }
    return ret;
  }

  let solv1 = new gSolver(
    [
      "0Aa0Aa0Aa0Aa|Aa0Aa0Aa0Aa0",
      "0Aa0Aa0Aa0Aa|0Aa0Aa0Aa0Aa",
      "Aa0Aa0Aa0Aa0|Aa0Aa0Aa0Aa0",
      "Aa0Aa0Aa0Aa0|0Aa0Aa0Aa0Aa",
    ],
    sq1Move,
    moves
  );

  let solv2 = new gSolver(
    [
      "0Aa0Aa0Aa0Aa|Bb1Bb1Bb1Bb1",
      "0Aa0Aa0Aa0Aa|1Bb1Bb1Bb1Bb",
      "Aa0Aa0Aa0Aa0|Bb1Bb1Bb1Bb1",
      "Aa0Aa0Aa0Aa0|1Bb1Bb1Bb1Bb",
    ],
    sq1Move,
    moves
  );

  let movere = /^\s*\(\s*(-?\d+),\s*(-?\d+)\s*\)\s*$/;
  let moveseq = scramble.split("/");

  for (let i = 0; i < moveseq.length; i += 1) {
    if (/^\s*$/.exec(moveseq[i])) {
      curScramble.push(0);
      continue;
    }

    let m = movere.exec(moveseq[i]);

    if (!m) continue;

    if (~~m[1]) {
      curScramble.push((~~m[1] + 12) % 12);
    }

    if (~~m[2]) {
      curScramble.push(-(~~m[2] + 12) % 12);
    }

    curScramble.push(0);
  }

  if (curScramble.length > 0) {
    curScramble.pop();
  }

  let sol1 = solv1.search(stateInit(sq1Move, "0Aa0Aa0Aa0Aa|Aa0Aa0Aa0Aa0"), 0);
  let sol2 = solv2.search(stateInit(sq1Move, "0Aa0Aa0Aa0Aa|Bb1Bb1Bb1Bb1"), 0);
  
  return [
    [ 'CS', adjustScramble(prettySq1Arr(sol1 || [])) ],
    [ 'CS + OBL', adjustScramble(prettySq1Arr(sol2 || [])) ],
  ];
  // span.append("Shape: ", tools.getSolutionSpan(prettySq1Arr(sol1)), "<br>");
  // span.append("Color: ", prettySq1Arr(sol2), "<br>");
}
