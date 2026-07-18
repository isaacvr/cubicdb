# Session-Scoped Solve Loading Design

## Goal

Load solves for the active timer session through the event bus without loading solves from every session into memory.

## Problem

The current event-driven solve list flow still asks persistence for all solves, then filters the current session in JavaScript. That keeps the migration moving, but it does unnecessary work for users with many years of solves across many sessions.

Stats still need all solves for the active session, so full pagination is not the right next step. The better next checkpoint is repository-level filtering by session.

## Decision

Add a query object to the solve list flow and support `sessionId` as the first query field.

```ts
export interface SolveListQuery {
  sessionId?: string;
}
```

The first implementation will request all solves for one session:

```ts
{ sessionId: "active-session-id" }
```

If `sessionId` is omitted, the repository returns all solves. That keeps existing non-timer callers working while we migrate them.

## Event flow

```txt
Timer mounts
  -> timer.solve.list-requested { ownerId, query: { sessionId } }
  -> SolvePersistenceService.loadSolves(query)
  -> Solve repository / IPC filters by session
  -> timer.solve.list-loaded { ownerId, query, solves }
  -> Timer initialization projects the loaded session solves
```

## Files and responsibilities

- `src/lib/events/timer/TimerEventPayloadMap.ts`
  - Add `query` to solve list request/loaded payloads.

- `src/lib/timer/solves/SolveListQuery.ts`
  - Own the query type so all layers share the same contract.

- `src/lib/timer/solves/SolvePersistenceService.ts`
  - Pass the query from the request event into the persistence port.
  - Include the query in the loaded event.

- `src/lib/timer/solves/SolveControllerPersistencePort.ts`
  - Forward the query to `SolveController`.

- `src/lib/controllers/SolveController.ts`
  - Accept an optional query in `loadSolves(query?)`.

- `src/lib/core/ports/ISolveRepository.ts`
  - Accept an optional query in `getSolves(query?)`.

- `src/lib/adapters/SolveRepositoryAdapter.ts`
  - Forward the query to `dataService.solve.getSolves(query?)`.

- `src/lib/data-services/SolveIPC/solveIPC.interface.ts`
  - Add query support to the IPC interface.

- `src/lib/data-services/SolveIPC/solveIPC.browser.ts`
  - Filter by `sessionId` at the IndexedDB boundary.
  - Keep all-solves fallback when no session is provided.

- `src/lib/data-services/SolveIPC/solveIPC.electron.ts`
  - Forward the query through preload IPC.

- `src/electron/preload.js`
  - Accept a query argument for `getSolves`.

- `src/electron/serverHandlers/solves.cjs`
  - Query by `session` when `query.sessionId` is provided.
  - Keep all-solves fallback when no session is provided.

- `src/lib/timer/TimerCompositionRoot.svelte.ts`
  - Accept a query when requesting solves.

- `src/lib/timer/Timer.svelte`
  - Request solves with `{ sessionId: page.params.sessionId }` on mount.

## Testing

The implementation should add or update tests for:

- `SolvePersistenceService`
  - list requests pass `query` to the port;
  - list-loaded events include the same query.

- `TimerCompositionRoot`
  - `requestSolvesList(query)` publishes a scoped list request with that query.

- `useInitialization`
  - still projects loaded solves after sessions are ready.

- Browser solve IPC
  - `getSolves({ sessionId })` returns only solves for that session.
  - `getSolves()` keeps returning all solves.

- Electron solve handler
  - session-scoped query uses database filtering.
  - no-query fallback still returns all solves.

## Non-goals for this slice

- No pagination yet.
- No repository-side statistics yet.
- No History UI pagination changes.
- No migration of the session dashboard solve counts yet unless needed by tests.

## Future extension

The query object can later grow without changing the event shape:

```ts
export interface SolveListQuery {
  sessionId?: string;
  offset?: number;
  limit?: number;
  sort?: "date-desc" | "date-asc";
  dateFrom?: number;
  dateTo?: number;
}
```
