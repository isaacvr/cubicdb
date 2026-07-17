import { isNNN } from '@constants';
import { ScrambleParser } from '@classes/scramble-parser';
import { prettyScramble } from '@helpers/strings';

export function normalizeScramble(scramble: string, mode: string): string {
  const parsed = isNNN(mode) ? ScrambleParser.parseNNNString(scramble) : scramble;
  return prettyScramble(parsed);
}
