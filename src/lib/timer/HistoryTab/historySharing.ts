import { AverageSetting, type Solve } from "@interfaces";
import { infinitePenalty, sTimer, timer } from "@helpers/timer";
import { getAverageS, solveSummary } from "@helpers/statistics";

function minTime(a: Solve, b: Solve) {
  if (infinitePenalty(a)) return b;
  if (infinitePenalty(b)) return a;
  return a.time < b.time ? a : b;
}

export function formatAverageShare(solves: readonly Solve[], n: number): string | null {
  const averageSolves = solves.slice(0, n).reverse();
  const average = getAverageS(n, averageSolves, AverageSetting.SEQUENTIAL);

  if (average.length !== n) return null;

  const minMax = averageSolves.reduce(
    (acc, solve) => [
      minTime(acc[0], solve) === solve ? solve : acc[0],
      minTime(acc[1], solve) === solve ? acc[1] : solve,
    ],
    [averageSolves[0], averageSolves[0]]
  );

  return `Ao${n}: ${timer(average[n - 1] as any, true)} = ${averageSolves
    .map(solve =>
      solve === minMax[0] || solve === minMax[1] ? `(${sTimer(solve, true)})` : sTimer(solve, true)
    )
    .join(", ")}`;
}

export function solveIndex(solves: readonly Solve[], solve: Solve) {
  if (!solve) return -1;

  for (let i = 0, maxi = solves.length; i < maxi; i += 1) {
    if (solves[i]._id === solve._id) {
      return maxi - i;
    }
  }

  return -1;
}

export function averageSummaryFromSolve(solves: readonly Solve[], solve: Solve, n: number) {
  const idx = solves.length - solveIndex(solves, solve);
  return solveSummary(solves.slice(idx, idx + n));
}
