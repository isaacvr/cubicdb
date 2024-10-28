import { Puzzle } from "@classes/puzzle/puzzle";
import { MISC } from "@constants";
import type { PuzzleOptions } from "@interfaces";
import * as all from "@cstimer/scramble";
import { ScrambleParser } from "@classes/scramble-parser";

export function scrambleToPuzzle(scramble: string, mode: string) {
  let cb: Puzzle[] = [];

  if (MISC.some(mmode => (typeof mmode === "string" ? mmode === mode : mmode.indexOf(mode) > -1))) {
    let options: PuzzleOptions[] = all.pScramble.options.get(mode)! as PuzzleOptions[];

    cb = ScrambleParser.parseMisc(scramble, mode).map((scr, pos) =>
      Puzzle.fromSequence(
        scr,
        {
          ...options[pos % options.length],
          rounded: true,
          headless: true,
        },
        false,
        true
      )
    );
  } else {
    cb = [
      Puzzle.fromSequence(
        scramble,
        {
          ...all.pScramble.options.get(mode),
          rounded: true,
          headless: true,
        } as PuzzleOptions,
        false,
        true
      ),
    ];
  }

  return cb;
}
