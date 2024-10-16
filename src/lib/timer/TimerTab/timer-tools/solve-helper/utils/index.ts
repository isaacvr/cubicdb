export function appendSuffix(moves: Record<string, number>, suffix = " 2'") {
  let ret: Record<string, number> = {};

  for (let m in moves) {
    for (let i = 0; i < suffix.length; i += 1) {
      ret[m + suffix[i]] = moves[m];
    }
  }
  return ret;
}

export function adjustScramble(s: string[]): string {
  return s.join(" ").replace(/\s+/g, " ").trim();
}
