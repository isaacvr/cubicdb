import type { Solve } from "@interfaces";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

interface SessionScopedEmitterInput {
  ownerId: string;
  sessionId: string;
  sourceEvent?: NativeTimestampSource;
}

export interface SolveListRequestEmitterInput extends SessionScopedEmitterInput {}

export interface SolveAddRequestEmitterInput extends SessionScopedEmitterInput {
  solve: Partial<Solve>;
}

export interface SolveUpdateRequestEmitterInput extends SessionScopedEmitterInput {
  solve: Solve;
}

export interface SolvesRemoveRequestEmitterInput extends SessionScopedEmitterInput {
  solves: Solve[];
}

function options(sourceEvent?: NativeTimestampSource) {
  return sourceEvent ? { sourceEvent } : undefined;
}

export function createSolveEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestList(input: SolveListRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        { ownerId: input.ownerId, sessionId: input.sessionId },
        options(input.sourceEvent)
      );
    },
    requestAdd(input: SolveAddRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        { ownerId: input.ownerId, sessionId: input.sessionId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestUpdate(input: SolveUpdateRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        { ownerId: input.ownerId, sessionId: input.sessionId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestRemove(input: SolvesRemoveRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        { ownerId: input.ownerId, sessionId: input.sessionId, solves: input.solves },
        options(input.sourceEvent)
      );
    },
  };
}
