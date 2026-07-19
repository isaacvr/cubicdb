import type { Solve } from "@interfaces";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

interface OwnerScopedEmitterInput {
  ownerId: string;
  sourceEvent?: NativeTimestampSource;
}

export interface SolveListRequestEmitterInput extends OwnerScopedEmitterInput {
  query?: SolveListQuery;
}

export interface SolveAddRequestEmitterInput extends OwnerScopedEmitterInput {
  solve: Partial<Solve>;
}

export interface SolveUpdateRequestEmitterInput extends OwnerScopedEmitterInput {
  solve: Solve;
}

export interface SolvesRemoveRequestEmitterInput extends OwnerScopedEmitterInput {
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
        { ownerId: input.ownerId, query: input.query },
        options(input.sourceEvent)
      );
    },
    requestAdd(input: SolveAddRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        { ownerId: input.ownerId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestUpdate(input: SolveUpdateRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        { ownerId: input.ownerId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestRemove(input: SolvesRemoveRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        { ownerId: input.ownerId, solves: input.solves },
        options(input.sourceEvent)
      );
    },
  };
}
