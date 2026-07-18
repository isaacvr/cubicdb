import type { EventBus, EventSubscription } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { Solve } from '@interfaces';

export interface SolvePersistencePort {
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
    private readonly port: SolvePersistencePort,
  ) {
    this.subscriptions = [
      this.bus.subscribe(
        TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        'solve-persistence:add',
        async event => {
          const solve = await this.port.addSolve(event.payload.solve);
          if (this.destroyed) return;
          await this.bus.publish(this.events.create(TIMER_EVENTS.SOLVE_ADDED, {
            ownerId: event.payload.ownerId,
            solve,
          }));
        },
      ),
      this.bus.subscribe(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        'solve-persistence:update',
        async event => {
          const result = await this.port.updateSolve(event.payload.solve);
          if (this.destroyed) return;
          await this.bus.publish(this.events.create(TIMER_EVENTS.SOLVE_UPDATED, {
            ownerId: event.payload.ownerId,
            previousSolve: result.previousSolve,
            solve: result.solve,
          }));
        },
      ),
      this.bus.subscribe(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        'solve-persistence:remove',
        async event => {
          const solves = await this.port.removeSolves(event.payload.solves);
          if (this.destroyed) return;
          await this.bus.publish(this.events.create(TIMER_EVENTS.SOLVES_REMOVED, {
            ownerId: event.payload.ownerId,
            solves,
          }));
        },
      ),
    ];
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }
}
