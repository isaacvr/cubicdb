import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import { getTimerRuntimeContext } from "$lib/timer/context/timerRuntimeContext";
import type { Solve } from "@interfaces";
import type { SolveFeature } from "./SolveFeature";

export type SessionIdSource = string | (() => string);

export function useSolve(source: SessionIdSource): SolveFeature {
  const runtime = getTimerRuntimeContext();
  const sessionId = () => String(typeof source === "function" ? source() : source);
  const feature = () => runtime.getSolveFeature(sessionId());

  return {
    get sessionId() {
      return sessionId();
    },
    get items() {
      return feature().items;
    },
    get solves() {
      return feature().solves;
    },
    get selectedSolves() {
      return feature().selectedSolves;
    },
    get selectedCount() {
      return feature().selectedCount;
    },
    get loading() {
      return feature().loading;
    },
    get error() {
      return feature().error;
    },
    toggleSelected(solve: Solve) {
      return feature().toggleSelected(solve);
    },
    selectAll(solves?: readonly Solve[]) {
      return feature().selectAll(solves);
    },
    invertSelection(solves?: readonly Solve[]) {
      return feature().invertSelection(solves);
    },
    selectInterval(solves: readonly Solve[]) {
      return feature().selectInterval(solves);
    },
    clearSelection() {
      return feature().clearSelection();
    },
    removeSelected(native?: NativeTimestampSource) {
      return feature().removeSelected(native);
    },
    load(native?: NativeTimestampSource) {
      return feature().load(native);
    },
    add(solve: Partial<Solve>, native?: NativeTimestampSource) {
      return feature().add(solve, native);
    },
    update(solve: Solve, native?: NativeTimestampSource) {
      return feature().update(solve, native);
    },
    remove(solves: readonly Solve[], native?: NativeTimestampSource) {
      return feature().remove(solves, native);
    },
  };
}
