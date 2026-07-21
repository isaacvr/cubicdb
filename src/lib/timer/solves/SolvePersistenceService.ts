import type { EventBus, EventSubscription } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import type { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { Solve } from "@interfaces";
import type { SolveListQuery } from "./SolveListQuery";
import { normalizeSolveFeatureError, type SolveOperation } from "./SolveFeatureError";

type SolveRequestEvent = Extract<
  TimerEvent,
  {
    type:
      | typeof TIMER_EVENTS.SOLVES_LIST_REQUESTED
      | typeof TIMER_EVENTS.SOLVE_ADD_REQUESTED
      | typeof TIMER_EVENTS.SOLVE_UPDATE_REQUESTED
      | typeof TIMER_EVENTS.SOLVES_REMOVE_REQUESTED;
  }
>;

export interface SolvePersistencePort {
  loadSolves(query?: SolveListQuery): Promise<Solve[]>;
  addSolve(solve: Partial<Solve>): Promise<Solve>;
  updateSolve(solve: Solve): Promise<{ previousSolve: Solve; solve: Solve }>;
  removeSolves(solves: Solve[]): Promise<Solve[]>;
}

export class SolvePersistenceService {
  private readonly subscriptions: EventSubscription[];
  private destroyed = false;

  constructor(
    private readonly bus: EventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly port: SolvePersistencePort
  ) {
    this.subscriptions = [
      this.bus.subscribe(
        TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        "solve-persistence:list",
        async event => {
          try {
            const solves = await this.port.loadSolves({ sessionId: event.payload.sessionId });
            if (this.destroyed) return;
            await this.bus.publish(
              this.events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
                ownerId: event.payload.ownerId,
                sessionId: event.payload.sessionId,
                requestId: event.id,
                solves,
              })
            );
          } catch (error) {
            await this.publishFailure(event, "list", error);
          }
        }
      ),
      this.bus.subscribe(TIMER_EVENTS.SOLVE_ADD_REQUESTED, "solve-persistence:add", async event => {
        try {
          const solve = await this.port.addSolve({
            ...event.payload.solve,
            session: event.payload.sessionId,
          });
          if (this.destroyed) return;
          await this.bus.publish(
            this.events.create(TIMER_EVENTS.SOLVE_ADDED, {
              ownerId: event.payload.ownerId,
              sessionId: event.payload.sessionId,
              requestId: event.id,
              solve,
            })
          );
        } catch (error) {
          await this.publishFailure(event, "add", error);
        }
      }),
      this.bus.subscribe(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        "solve-persistence:update",
        async event => {
          try {
            const result = await this.port.updateSolve(event.payload.solve);
            if (this.destroyed) return;
            await this.bus.publish(
              this.events.create(TIMER_EVENTS.SOLVE_UPDATED, {
                ownerId: event.payload.ownerId,
                sessionId: event.payload.sessionId,
                requestId: event.id,
                previousSolve: result.previousSolve,
                solve: result.solve,
              })
            );
          } catch (error) {
            await this.publishFailure(event, "update", error);
          }
        }
      ),
      this.bus.subscribe(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        "solve-persistence:remove",
        async event => {
          try {
            const solves = await this.port.removeSolves(event.payload.solves);
            if (this.destroyed) return;
            await this.bus.publish(
              this.events.create(TIMER_EVENTS.SOLVES_REMOVED, {
                ownerId: event.payload.ownerId,
                sessionId: event.payload.sessionId,
                requestId: event.id,
                solves,
              })
            );
          } catch (error) {
            await this.publishFailure(event, "remove", error);
          }
        }
      ),
    ];
  }

  private async publishFailure(
    event: SolveRequestEvent,
    operation: SolveOperation,
    error: unknown
  ): Promise<void> {
    if (this.destroyed) return;
    await this.bus.publish(
      this.events.create(TIMER_EVENTS.SOLVE_REQUEST_FAILED, {
        ownerId: event.payload.ownerId,
        sessionId: event.payload.sessionId,
        requestId: event.id,
        operation,
        error: normalizeSolveFeatureError(error, operation),
      })
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }
}
