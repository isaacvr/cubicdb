import type { Solve } from "@interfaces";
import { Err, type Result } from "$lib/core/domain/Result";
import type { EventBus } from "$lib/events/EventBus";
import { createSolveEventEmitters } from "$lib/events/emitters/solveEventEmitters";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import type { NativeTimestampSource, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { SolveFeatureError, SolveOperation } from "./SolveFeatureError";
import { createSolveProjection } from "./SolveProjection.svelte";

export interface SolveFeature {
  readonly sessionId: string;
  readonly items: readonly Solve[];
  readonly loading: boolean;
  readonly error: SolveFeatureError | null;
  load(sourceEvent?: NativeTimestampSource): Promise<Result<void, SolveFeatureError>>;
  add(
    solve: Partial<Solve>,
    sourceEvent?: NativeTimestampSource
  ): Promise<Result<Solve, SolveFeatureError>>;
  update(
    solve: Solve,
    sourceEvent?: NativeTimestampSource
  ): Promise<Result<Solve, SolveFeatureError>>;
  remove(
    solves: readonly Solve[],
    sourceEvent?: NativeTimestampSource
  ): Promise<Result<readonly Solve[], SolveFeatureError>>;
}

export interface InternalSolveFeature extends SolveFeature {
  destroy(): void;
}

export function createSolveFeature(input: {
  bus: EventBus<TimerEvent>;
  events: TimerEventFactory;
  ownerId: string;
  sessionId: string;
  ready?: Promise<void>;
}): InternalSolveFeature {
  const projection = createSolveProjection(input);
  const emitters = createSolveEventEmitters(input);
  const ready = input.ready ?? Promise.resolve();

  function consume<T>(requestId: string, operation: SolveOperation): Result<T, SolveFeatureError> {
    return (
      projection.consumeResult<T>(requestId) ??
      Err({
        code: "SOLVE_RESPONSE_MISSING",
        operation,
        message: `No correlated ${operation} result for ${requestId}`,
      })
    );
  }

  function scopeMismatch(operation: "update" | "remove"): Result<never, SolveFeatureError> {
    return Err({
      code: "SESSION_SCOPE_MISMATCH",
      operation,
      message: `Cannot ${operation} a solve outside session ${input.sessionId}`,
    });
  }

  return {
    sessionId: input.sessionId,
    get items() {
      return projection.items;
    },
    get loading() {
      return projection.loading;
    },
    get error() {
      return projection.error;
    },
    async load(sourceEvent) {
      await ready;
      const requestId = await emitters.requestList({
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        sourceEvent,
      });
      return consume<void>(requestId, "list");
    },
    async add(solve, sourceEvent) {
      await ready;
      const requestId = await emitters.requestAdd({
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        solve: { ...solve, session: input.sessionId },
        sourceEvent,
      });
      return consume<Solve>(requestId, "add");
    },
    async update(solve, sourceEvent) {
      if (String(solve.session) !== input.sessionId) return scopeMismatch("update");
      await ready;
      const requestId = await emitters.requestUpdate({
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        solve,
        sourceEvent,
      });
      return consume<Solve>(requestId, "update");
    },
    async remove(solves, sourceEvent) {
      if (solves.some(solve => String(solve.session) !== input.sessionId)) {
        return scopeMismatch("remove");
      }
      await ready;
      const requestId = await emitters.requestRemove({
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        solves: [...solves],
        sourceEvent,
      });
      return consume<readonly Solve[]>(requestId, "remove");
    },
    destroy() {
      projection.detach();
    },
  };
}
