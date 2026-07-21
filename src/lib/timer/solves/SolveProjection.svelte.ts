import type { Solve } from "@interfaces";
import type { Result } from "$lib/core/domain/Result";
import { Err, Ok } from "$lib/core/domain/Result";
import type { EventBus } from "$lib/events/EventBus";
import { createEventModule, type EventModule } from "$lib/events/modules/EventModule";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { SolveFeatureError } from "./SolveFeatureError";

function byDateDescending(first: Solve, second: Solve): number {
  return Number(second.date ?? 0) - Number(first.date ?? 0);
}

function orderSolvesByDateDescending(solves: readonly Solve[]): Solve[] {
  return [...solves].sort(byDateDescending);
}

export interface SolveProjection {
  readonly ownerId: string;
  readonly sessionId: string;
  readonly items: readonly Solve[];
  readonly selectedItems: readonly Solve[];
  readonly selectedCount: number;
  readonly loading: boolean;
  readonly error: SolveFeatureError | null;
  toggleSelected(solve: Solve): number;
  selectAll(solves?: readonly Solve[]): number;
  invertSelection(solves?: readonly Solve[]): number;
  selectInterval(solves: readonly Solve[]): number;
  clearSelection(): number;
  consumeResult<T>(requestId: string): Result<T, SolveFeatureError> | undefined;
  detach(): void;
}

class ReactiveSolveProjection implements SolveProjection {
  private projectedItems = $state<Solve[]>([]);
  private projectedLoading = $state(false);
  private projectedError = $state<SolveFeatureError | null>(null);
  private readonly results = new Map<string, Result<unknown, SolveFeatureError>>();
  private readonly module: EventModule;

  constructor(
    private readonly bus: EventBus<TimerEvent>,
    readonly ownerId: string,
    readonly sessionId: string
  ) {
    const requestOptions = { priority: 100 };
    this.module = createEventModule([
      bus.subscribe(
        TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        `${ownerId}:${sessionId}:list-request`,
        event => this.onRequest(event.payload),
        requestOptions
      ),
      bus.subscribe(
        TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        `${ownerId}:${sessionId}:add-request`,
        event => this.onRequest(event.payload),
        requestOptions
      ),
      bus.subscribe(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        `${ownerId}:${sessionId}:update-request`,
        event => this.onRequest(event.payload),
        requestOptions
      ),
      bus.subscribe(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        `${ownerId}:${sessionId}:remove-request`,
        event => this.onRequest(event.payload),
        requestOptions
      ),
      bus.subscribe(
        TIMER_EVENTS.SOLVES_LIST_LOADED,
        `${ownerId}:${sessionId}:list-loaded`,
        event => {
          if (!this.matches(event.payload)) return;
          this.projectedItems = orderSolvesByDateDescending(
            event.payload.solves.filter(solve => String(solve.session) === this.sessionId)
          );
          this.complete(event.payload.requestId, Ok(undefined));
        }
      ),
      bus.subscribe(TIMER_EVENTS.SOLVE_ADDED, `${ownerId}:${sessionId}:added`, event => {
        if (!this.matches(event.payload)) return;
        this.projectedItems = orderSolvesByDateDescending([
          event.payload.solve,
          ...this.projectedItems,
        ]);
        this.complete(event.payload.requestId, Ok(event.payload.solve));
      }),
      bus.subscribe(TIMER_EVENTS.SOLVE_UPDATED, `${ownerId}:${sessionId}:updated`, event => {
        if (!this.matches(event.payload)) return;
        this.projectedItems = orderSolvesByDateDescending(
          this.projectedItems.map(solve =>
            solve._id === event.payload.solve._id ? event.payload.solve : solve
          )
        );
        this.complete(event.payload.requestId, Ok(event.payload.solve));
      }),
      bus.subscribe(TIMER_EVENTS.SOLVES_REMOVED, `${ownerId}:${sessionId}:removed`, event => {
        if (!this.matches(event.payload)) return;
        const removedIds = new Set(event.payload.solves.map(solve => solve._id));
        this.projectedItems = this.projectedItems.filter(solve => !removedIds.has(solve._id));
        this.complete(event.payload.requestId, Ok(event.payload.solves));
      }),
      bus.subscribe(TIMER_EVENTS.SOLVE_REQUEST_FAILED, `${ownerId}:${sessionId}:failed`, event => {
        if (!this.matches(event.payload)) return;
        this.projectedError = event.payload.error;
        this.projectedLoading = false;
        this.results.set(event.payload.requestId, Err(event.payload.error));
      }),
    ]);
  }

  get items(): readonly Solve[] {
    return this.projectedItems;
  }

  get selectedItems(): readonly Solve[] {
    return this.projectedItems.filter(solve => solve.selected);
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  get loading(): boolean {
    return this.projectedLoading;
  }

  get error(): SolveFeatureError | null {
    return this.projectedError;
  }

  consumeResult<T>(requestId: string): Result<T, SolveFeatureError> | undefined {
    const result = this.results.get(requestId) as Result<T, SolveFeatureError> | undefined;
    this.results.delete(requestId);
    return result;
  }

  toggleSelected(solve: Solve): number {
    this.projectedItems = this.projectedItems.map(item =>
      item._id === solve._id ? { ...item, selected: !item.selected } : item
    );
    return this.selectedCount;
  }

  selectAll(solves: readonly Solve[] = this.projectedItems): number {
    return this.setSelected(solves, true);
  }

  invertSelection(solves: readonly Solve[] = this.projectedItems): number {
    const ids = new Set(solves.map(solve => solve._id));
    this.projectedItems = this.projectedItems.map(item =>
      ids.has(item._id) ? { ...item, selected: !item.selected } : item
    );
    return this.selectedCount;
  }

  selectInterval(solves: readonly Solve[]): number {
    const firstSelectedIndex = solves.findIndex(solve => solve.selected);
    const lastSelectedIndex = solves.findLastIndex(solve => solve.selected);
    if (firstSelectedIndex < 0 || lastSelectedIndex <= firstSelectedIndex) {
      return this.selectedCount;
    }
    return this.selectAll(solves.slice(firstSelectedIndex, lastSelectedIndex + 1));
  }

  clearSelection(): number {
    this.projectedItems = this.projectedItems.map(item => ({ ...item, selected: false }));
    return this.selectedCount;
  }

  detach(): void {
    this.module.detach();
  }

  private matches(payload: { ownerId: string; sessionId: string }): boolean {
    return payload.ownerId === this.ownerId && payload.sessionId === this.sessionId;
  }

  private onRequest(payload: { ownerId: string; sessionId: string }): void {
    if (!this.matches(payload)) return;
    this.projectedLoading = true;
    this.projectedError = null;
  }

  private complete<T>(requestId: string, result: Result<T, never>): void {
    this.projectedLoading = false;
    this.projectedError = null;
    this.results.set(requestId, result);
  }

  private setSelected(solves: readonly Solve[], selected: boolean): number {
    const ids = new Set(solves.map(solve => solve._id));
    this.projectedItems = this.projectedItems.map(item =>
      ids.has(item._id) ? { ...item, selected } : item
    );
    return this.selectedCount;
  }
}

export function createSolveProjection(input: {
  bus: EventBus<TimerEvent>;
  ownerId: string;
  sessionId: string;
}): SolveProjection {
  return new ReactiveSolveProjection(input.bus, input.ownerId, input.sessionId);
}
