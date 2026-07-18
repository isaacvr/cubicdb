# Session-Scoped Solve Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load only the active session's solves for Timer/History/Stats while preserving the all-solves fallback for unmigrated callers.

**Architecture:** Extend the existing solve-list event flow with a `SolveListQuery` object. The Timer publishes `timer.solve.list-requested` with `{ sessionId }`; persistence, controller, repository, IPC, and storage adapters forward that query to filter by session at the persistence boundary.

**Tech Stack:** Svelte 5, TypeScript, Vitest, IndexedDB via `idb`, Electron IPC/Nedb, existing application `EventBus<TimerEvent>`.

## Global Constraints

- Do not run a build.
- Do not run `svelte-check`.
- Use focused Vitest tests.
- Use TDD: failing test before production code for each behavior change.
- Keep fallback behavior: calling `getSolves()` without a query returns all solves.
- No pagination in this slice.
- No repository-side statistics in this slice.
- Keep changes reversible and scoped to session-filtered solve loading.

---

## File Structure

- Create `src/lib/timer/solves/SolveListQuery.ts`
  - Defines `SolveListQuery` with `sessionId?: string`.

- Modify `src/lib/events/timer/TimerEventPayloadMap.ts`
  - Adds `query` to `SOLVES_LIST_REQUESTED` and `SOLVES_LIST_LOADED`.

- Modify `src/lib/timer/solves/SolvePersistenceService.ts`
  - Passes `query` to `SolvePersistencePort.loadSolves(query)`.
  - Publishes `query` back in `SOLVES_LIST_LOADED`.

- Modify `src/lib/timer/solves/SolveControllerPersistencePort.ts`
  - Forwards `query` to `SolveController.loadSolves(query)`.

- Modify `src/lib/controllers/SolveController.ts`
  - Accepts `loadSolves(query?: SolveListQuery)`.

- Modify `src/lib/core/ports/ISolveRepository.ts`
  - Accepts `getSolves(query?: SolveListQuery)`.

- Modify `src/lib/core/usecases/GetSolves.ts`
  - Accepts `execute(query?: SolveListQuery)`.

- Modify `src/lib/adapters/SolveRepositoryAdapter.ts`
  - Forwards `query` to `dataService.solve.getSolves(query)`.

- Modify `src/lib/data-services/SolveIPC/solveIPC.interface.ts`
  - Accepts `getSolves(query?: SolveListQuery)`.

- Modify `src/lib/data-services/SolveIPC/solveIPC.browser.ts`
  - Filters by `sessionId` at IndexedDB boundary.

- Modify `src/lib/data-services/SolveIPC/solveIPC.electron.ts`
  - Forwards query through Electron IPC.

- Modify `src/lib/data-services/SolveIPC/solveIPC.noop.ts`
  - Accepts query for interface compatibility.

- Modify `src/electron/preload.js`
  - Forwards query argument to `get-solves`.

- Modify `src/electron/serverHandlers/solves.cjs`
  - Filters by `session` when `query.sessionId` is present.

- Modify `src/lib/timer/TimerCompositionRoot.svelte.ts`
  - Accepts `requestSolvesList(query?: SolveListQuery)`.

- Modify `src/lib/timer/Timer.svelte`
  - Requests solves with `{ sessionId: page.params.sessionId }` on mount.

## Task 1: Add the query contract to solve list events and service

**Files:**
- Create: `src/lib/timer/solves/SolveListQuery.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/timer/solves/SolvePersistenceService.ts`
- Modify: `src/lib/timer/solves/SolvePersistenceService.test.ts`

**Interfaces:**
- Produces:
  - `export interface SolveListQuery { sessionId?: string }`
  - `SolvePersistencePort.loadSolves(query?: SolveListQuery): Promise<Solve[]>`
  - `SOLVES_LIST_REQUESTED`: `{ ownerId: string; query?: SolveListQuery }`
  - `SOLVES_LIST_LOADED`: `{ ownerId: string; query?: SolveListQuery; solves: Solve[] }`

- [ ] **Step 1: Write the failing service test**

Add this assertion to `src/lib/timer/solves/SolvePersistenceService.test.ts` in the list request test:

```ts
const query = { sessionId: 'session:one' };

await bus.publish(events.create(TIMER_EVENTS.SOLVES_LIST_REQUESTED, {
  ownerId: 'timer:one',
  query,
}));

expect(port.loadSolves).toHaveBeenCalledWith(query);
expect(observed.at(-1)).toMatchObject({
  type: TIMER_EVENTS.SOLVES_LIST_LOADED,
  payload: {
    ownerId: 'timer:one',
    query,
    solves: loadedSolves,
  },
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test:unit -- src/lib/timer/solves/SolvePersistenceService.test.ts
```

Expected: FAIL because `query` is not part of the payload/port contract yet.

- [ ] **Step 3: Add `SolveListQuery`**

Create `src/lib/timer/solves/SolveListQuery.ts`:

```ts
export interface SolveListQuery {
  sessionId?: string;
}
```

- [ ] **Step 4: Update event payload and service port**

Change payloads in `TimerEventPayloadMap.ts`:

```ts
[TIMER_EVENTS.SOLVES_LIST_REQUESTED]: { ownerId: string; query?: SolveListQuery };
[TIMER_EVENTS.SOLVES_LIST_LOADED]: { ownerId: string; query?: SolveListQuery; solves: Solve[] };
```

Change `SolvePersistencePort`:

```ts
loadSolves(query?: SolveListQuery): Promise<Solve[]>;
```

Change the service list handler:

```ts
const solves = await this.port.loadSolves(event.payload.query);
await this.bus.publish(this.events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
  ownerId: event.payload.ownerId,
  query: event.payload.query,
  solves,
}));
```

- [ ] **Step 5: Run the service test**

Run:

```bash
npm run test:unit -- src/lib/timer/solves/SolvePersistenceService.test.ts
```

Expected: PASS.

## Task 2: Forward query through controller/repository/IPC

**Files:**
- Modify: `src/lib/timer/solves/SolveControllerPersistencePort.ts`
- Modify: `src/lib/controllers/SolveController.ts`
- Modify: `src/lib/core/ports/ISolveRepository.ts`
- Modify: `src/lib/core/usecases/GetSolves.ts`
- Modify: `src/lib/adapters/SolveRepositoryAdapter.ts`
- Modify: `src/lib/data-services/SolveIPC/solveIPC.interface.ts`
- Modify: `src/lib/data-services/SolveIPC/solveIPC.browser.ts`
- Modify: `src/lib/data-services/SolveIPC/solveIPC.electron.ts`
- Modify: `src/lib/data-services/SolveIPC/solveIPC.noop.ts`
- Modify: `src/electron/preload.js`
- Modify: `src/electron/serverHandlers/solves.cjs`

**Interfaces:**
- Consumes: `SolveListQuery`
- Produces: `getSolves(query?: SolveListQuery): Promise<Solve[]>` across repository and IPC boundaries.

- [ ] **Step 1: Write failing adapter/service tests**

Update or add focused tests so:

```ts
await controllerPort.loadSolves({ sessionId: 'session:one' });
expect(controller.loadSolves).toHaveBeenCalledWith({ sessionId: 'session:one' });
```

For browser IPC, use fake/stub IndexedDB if current tests already exist. If not practical, add a pure helper in the browser IPC module:

```ts
export function filterSolvesByQuery(solves: Solve[], query?: SolveListQuery): Solve[] {
  if (!query?.sessionId) return solves;
  return solves.filter(solve => solve.session === query.sessionId);
}
```

Test:

```ts
expect(filterSolvesByQuery([
  solve({ session: 'session:one' }),
  solve({ session: 'session:two' }),
], { sessionId: 'session:one' })).toEqual([
  solve({ session: 'session:one' }),
]);
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm run test:unit -- src/lib/timer/solves/SolvePersistenceService.test.ts src/lib/data-services/SolveIPC/solveIPC.browser.test.ts
```

Expected: FAIL until query forwarding/filtering exists.

- [ ] **Step 3: Forward query in TypeScript layers**

Apply this signature pattern:

```ts
loadSolves(query?: SolveListQuery): Promise<Solve[]>
getSolves(query?: SolveListQuery): Promise<Solve[]>
execute(query?: SolveListQuery): Promise<Solve[]>
```

Every layer forwards the query unchanged.

- [ ] **Step 4: Implement browser filtering**

Minimal version:

```ts
async getSolves(query?: SolveListQuery) {
  await this.init();
  if (!this.DB) return [];
  const solves = await this.DB.getAll(SolveStore) as Solve[];
  return filterSolvesByQuery(solves, query);
}
```

This preserves correctness now. IndexedDB indexes can be a later optimization if needed.

- [ ] **Step 5: Implement Electron filtering**

In `src/electron/preload.js`:

```js
getSolves: async query => ipc.invoke("get-solves", query),
```

In `src/electron/serverHandlers/solves.cjs`:

```js
ipcMain.handle("get-solves", async (_, query) => {
  const filter = query?.sessionId ? { session: query.sessionId } : {};
  return new Promise((resolve, reject) => {
    Solves.find(filter).sort({ date: -1 }).exec((err, docs) => {
      if (err) reject(err);
      else resolve(docs);
    });
  });
});
```

Adapt callback shape to the existing handler style.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test:unit -- src/lib/timer/solves/SolvePersistenceService.test.ts src/lib/data-services/SolveIPC/solveIPC.browser.test.ts
```

Expected: PASS.

## Task 3: Request active session solves from the Timer runtime

**Files:**
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Modify: `src/lib/timer/Timer.svelte`

**Interfaces:**
- Consumes: `SolveListQuery`
- Produces: `requestSolvesList(query?: SolveListQuery): Promise<Solve[]>`

- [ ] **Step 1: Write failing runtime test**

In `TimerCompositionRoot.test.ts`, update the list request test:

```ts
const query = { sessionId: 'session:one' };

await expect(runtime.requestSolvesList(query)).resolves.toBe(solves);

expect(observed).toContainEqual(expect.objectContaining({
  type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
  payload: { ownerId: 'timer:one', query },
}));
```

- [ ] **Step 2: Run failing runtime test**

Run:

```bash
npm run test:unit -- src/lib/timer/TimerCompositionRoot.test.ts
```

Expected: FAIL until runtime accepts/publishes the query.

- [ ] **Step 3: Update runtime**

Change:

```ts
requestSolvesList(nativeEvent?: NativeTimestampSource): Promise<Solve[]>;
```

to:

```ts
requestSolvesList(query?: SolveListQuery, nativeEvent?: NativeTimestampSource): Promise<Solve[]>;
```

Publish:

```ts
{ ownerId, query }
```

- [ ] **Step 4: Update Timer mount**

In `Timer.svelte`, change:

```ts
loadSolves: () => eventTimerRuntime.requestSolvesList(),
```

to:

```ts
loadSolves: () => eventTimerRuntime.requestSolvesList({
  sessionId: page.params.sessionId,
}),
```

- [ ] **Step 5: Run runtime and initialization tests**

Run:

```bash
npm run test:unit -- src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/utilities/useInitialization.test.ts
```

Expected: PASS.

## Task 4: Verification and commit

**Files:**
- All files touched in Tasks 1-3.

- [ ] **Step 1: Run focused Vitest**

Run:

```bash
npm run test:unit -- src/lib/timer/solves/SolvePersistenceService.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/utilities/useInitialization.test.ts src/lib/data-services/SolveIPC/solveIPC.browser.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run targeted ESLint**

Run ESLint on touched files:

```bash
npx eslint src/lib/timer/solves/SolveListQuery.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/timer/solves/SolvePersistenceService.ts src/lib/timer/solves/SolvePersistenceService.test.ts src/lib/timer/solves/SolveControllerPersistencePort.ts src/lib/controllers/SolveController.ts src/lib/core/ports/ISolveRepository.ts src/lib/core/usecases/GetSolves.ts src/lib/adapters/SolveRepositoryAdapter.ts src/lib/data-services/SolveIPC/solveIPC.interface.ts src/lib/data-services/SolveIPC/solveIPC.browser.ts src/lib/data-services/SolveIPC/solveIPC.electron.ts src/lib/data-services/SolveIPC/solveIPC.noop.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/Timer.svelte
```

Expected: exit code 0.

- [ ] **Step 3: Commit**

Run:

```bash
git add <touched-files>
git -c commit.gpgsign=false commit -m "feat: load solves by session query"
```

Expected: focused commit with session-scoped solve loading.

## Self-Review

- Spec coverage: covers query contract, event payloads, service, controller/repository/IPC, browser/Electron paths, Timer mount, fallback behavior, tests.
- Completeness scan: no incomplete or deferred implementation language in task steps.
- Type consistency: the same `SolveListQuery` and `query?: SolveListQuery` signatures are used across all tasks.
- Scope check: pagination and repository-side statistics are explicitly excluded.
