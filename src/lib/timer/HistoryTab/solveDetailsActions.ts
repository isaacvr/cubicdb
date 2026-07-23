import { options } from "@cstimer/scramble/scramble";
import { CubeMode } from "@constants";
import { Penalty, type Solve } from "@interfaces";
import { startViewTransition } from "@helpers/DOM";
import { tick } from "svelte";
import type { CubicDBModuleImageGenerator } from "$lib/timer/scramble";

export interface SolveEditTransitionNames {
  shell: string;
  date: string;
  time: string;
}

interface OpenSolveDetailsTransitionOptions {
  solve: Solve;
  transitionTarget: HTMLButtonElement;
  setTransitionNames: (transitionNames: SolveEditTransitionNames) => void;
  openSolve: (solve: Solve) => void;
}

function afterNextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

export function createSolveEditTransitionNames(solve?: Solve): SolveEditTransitionNames {
  const id = solve?._id || Date.now();

  return {
    shell: `solve-edit-shell-${id}`,
    date: `solve-edit-date-${id}`,
    time: `solve-edit-time-${id}`,
  };
}

export function createEditableSolve(solve: Solve): Solve {
  return {
    ...solve,
    comments: solve.comments ?? "",
  };
}

export async function generateSolvePreview(
  solve: Solve,
  generator: CubicDBModuleImageGenerator,
  isCurrentSolve: () => boolean
) {
  const sMode = solve.mode as string;
  const md = options.has(sMode) ? sMode : "333";

  await afterNextFrame();

  if (!isCurrentSolve()) return null;

  return generator.generate({
    scramble: solve.scramble,
    scrambleMode: md,
    puzzle: "rubik",
    mode: CubeMode.NORMAL,
    view: "trans",
  });
}

export function applyPenalty(solve: Solve, penalty: Penalty) {
  if (penalty === Penalty.P2) {
    solve.penalty != Penalty.P2 && (solve.time += 2000);
  } else if (solve.penalty === Penalty.P2) {
    solve.time -= 2000;
  }

  solve.penalty = penalty;
}

export function openSolveDetailsWithTransition({
  solve,
  transitionTarget,
  setTransitionNames,
  openSolve,
}: OpenSolveDetailsTransitionOptions) {
  if (!transitionTarget.isConnected) {
    openSolve(solve);
    return;
  }

  const transitionNames = createSolveEditTransitionNames(solve);
  const dateTarget = transitionTarget.querySelector<HTMLElement>(".solve-row-date");
  const timeTarget = transitionTarget.querySelector<HTMLElement>(".solve-row-time");

  setTransitionNames(transitionNames);
  transitionTarget.style.viewTransitionName = transitionNames.shell;
  if (dateTarget) dateTarget.style.viewTransitionName = transitionNames.date;
  if (timeTarget) timeTarget.style.viewTransitionName = transitionNames.time;

  startViewTransition(async () => {
    transitionTarget.style.viewTransitionName = "none";
    if (dateTarget) dateTarget.style.viewTransitionName = "none";
    if (timeTarget) timeTarget.style.viewTransitionName = "none";
    openSolve(solve);
    await tick();
  });
}
