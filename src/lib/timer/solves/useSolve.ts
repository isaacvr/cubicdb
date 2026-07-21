import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import { getTimerRuntimeContext } from "$lib/timer/context/timerRuntimeContext";
import type { Solve } from "@interfaces";
import type { SolveFeature } from "./SolveFeature";

export type SessionIdSource = string | (() => string);

export function useSolve(source: SessionIdSource): SolveFeature {
  const runtime = getTimerRuntimeContext();
  const sessionId = () => (typeof source === "function" ? source() : source);
  const feature = () => runtime.getSolveFeature(sessionId());

  return {
    get sessionId() {
      return sessionId();
    },
    get items() {
      return feature().items;
    },
    get loading() {
      return feature().loading;
    },
    get error() {
      return feature().error;
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
