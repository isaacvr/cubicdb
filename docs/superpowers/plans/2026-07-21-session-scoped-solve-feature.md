# Session-Scoped Solve Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and production-wire a React-hook-style `useSolve(sessionId)` feature backed by correlated solve events and a session-scoped reactive projection, without changing Timer UI behavior yet.

**Architecture:** UI-facing solve access is a small facade; typed emitters dispatch requests, the application-scoped persistence service publishes correlated results or failures, and a `{ ownerId, sessionId }` projection reacts. `TimerRuntime` caches one feature per session and temporarily retains its existing request methods as compatibility delegates. The next plan migrates `HistoryTab` to the facade.

**Tech Stack:** SvelteKit 5 runes, TypeScript, Vitest, the existing typed `EventBus`, `TimerEventFactory`, and `Result<T, E>`.

## Global Constraints

- Preserve existing Timer behavior and the existing Figma design.
- A solve always belongs to exactly one session; there is no unscoped solve list or facade.
- Components must not import EventBus, event factories, event registries, emitters, persistence ports, or environment adapters.
- Expected failures use typed failure events and `Result`; unexpected handler bugs remain observable through `HANDLER_FAILED`.
- Programmatic events use the monotonic application clock; native inputs preserve `timeStamp`.
- Do not run a production build or `svelte-check`.
- Use focused Vitest, ESLint, and Prettier checks.
- Preserve the user's existing uncommitted changes in `HistoryTab.svelte` and `TimerRegression.contract.test.ts`; this plan does not edit either file.

## File Structure

- `src/lib/timer/solves/SolveFeatureError.ts`: normalized feature-level operations and failures.
- `src/lib/timer/solves/SolveProjection.svelte.ts`: session-scoped reactive reducer/read model and request outcomes.
- `src/lib/timer/solves/SolveFeature.ts`: readable commands/getters over emitters and the projection.
- `src/lib/timer/solves/useSolve.ts`: component hook that resolves the current Timer runtime and session source.
- `src/lib/timer/context/timerRuntimeContext.ts`: narrow context for owner-scoped feature access.
- Existing event, emitter, persistence, runtime, and tests are modified in place.

---

### Task 1: Require Session Scope and Correlation in Solve Events

**Files:**
- Create: `src/lib/timer/solves/SolveFeatureError.ts`
- Modify: `src/lib/events/timer/TimerEventRegistry.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/TimerEventTypes.test-d.ts`
- Modify fixtures in: `src/lib/logger/EventLogger.test.ts`
- Modify fixtures in: `src/lib/events/emitters/createTypedEventEmitter.test.ts`
- Modify fixtures in: `src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts`
- Modify fixtures in: `src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts`

**Interfaces:**
- Consumes: `Result<T, E>` conventions and existing `TimerEventFactory.create()` typing.
- Produces: `SolveOperation`, `SolveFeatureError`, `normalizeSolveFeatureError()`, required `sessionId` on all solve events, `requestId` on result/failure events, and `TIMER_EVENTS.SOLVE_REQUEST_FAILED`.

- [ ] **Step 1: Add compile-time assertions for required session and correlation fields**

Append to `TimerEventTypes.test-d.ts` using a complete solve fixture:

```ts
import { Penalty, type Solve } from '@interfaces';

const typedSolve: Solve = {
  _id: 'solve:one',
  session: 'session:one',
  time: 1234,
  date: 1,
  scramble: 'R U',
  penalty: Penalty.NONE,
  selected: false,
};

factory.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
  ownerId: 'timer:one',
  sessionId: 'session:one',
  solve: typedSolve,
});

factory.create(TIMER_EVENTS.SOLVE_UPDATED, {
  ownerId: 'timer:one',
  sessionId: 'session:one',
  requestId: 'request:one',
  previousSolve: typedSolve,
  solve: typedSolve,
});

factory.create(TIMER_EVENTS.SOLVE_REQUEST_FAILED, {
  ownerId: 'timer:one',
  sessionId: 'session:one',
  requestId: 'request:one',
  operation: 'update',
  error: {
    code: 'SOLVE_PERSISTENCE_FAILED',
    operation: 'update',
    message: 'Update failed',
  },
});

// @ts-expect-error solve requests require sessionId.
factory.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
  ownerId: 'timer:one',
  solve: typedSolve,
});

// @ts-expect-error solve results require requestId.
factory.create(TIMER_EVENTS.SOLVE_UPDATED, {
  ownerId: 'timer:one',
  sessionId: 'session:one',
  previousSolve: typedSolve,
  solve: typedSolve,
});
```

- [ ] **Step 2: Run the type-level event test and verify RED**

Run:

```bash
pnpm exec vitest typecheck --run src/lib/events/timer/TimerEventTypes.test-d.ts
```

Expected: FAIL because solve payloads do not yet require `sessionId`/`requestId` and `SOLVE_REQUEST_FAILED` does not exist.

- [ ] **Step 3: Add the feature error contract**

Create `SolveFeatureError.ts`:

```ts
export type SolveOperation = 'list' | 'add' | 'update' | 'remove';

export type SolveFeatureError =
  | {
      code: 'SOLVE_PERSISTENCE_FAILED';
      operation: SolveOperation;
      message: string;
    }
  | {
      code: 'SESSION_SCOPE_MISMATCH';
      operation: 'update' | 'remove';
      message: string;
    }
  | {
      code: 'SOLVE_RESPONSE_MISSING';
      operation: SolveOperation;
      message: string;
    };

export function normalizeSolveFeatureError(
  error: unknown,
  operation: SolveOperation,
): SolveFeatureError {
  return {
    code: 'SOLVE_PERSISTENCE_FAILED',
    operation,
    message: error instanceof Error ? error.message : String(error),
  };
}
```

- [ ] **Step 4: Add the event name and replace solve payload contracts**

Add to `TIMER_EVENTS` after `SOLVES_REMOVED`:

```ts
SOLVE_REQUEST_FAILED: 'timer.solve.request-failed',
```

In `TimerEventPayloadMap.ts`, import the new types and replace the solve entries with:

```ts
type SolveScopePayload = { ownerId: string; sessionId: string };
type SolveResultPayload = SolveScopePayload & { requestId: string };

[TIMER_EVENTS.SOLVES_LIST_REQUESTED]: SolveScopePayload;
[TIMER_EVENTS.SOLVES_LIST_LOADED]: SolveResultPayload & { solves: Solve[] };
[TIMER_EVENTS.SOLVE_ADD_REQUESTED]: SolveScopePayload & { solve: Partial<Solve> };
[TIMER_EVENTS.SOLVE_ADDED]: SolveResultPayload & { solve: Solve };
[TIMER_EVENTS.SOLVE_UPDATE_REQUESTED]: SolveScopePayload & { solve: Solve };
[TIMER_EVENTS.SOLVE_UPDATED]: SolveResultPayload & {
  previousSolve: Solve;
  solve: Solve;
};
[TIMER_EVENTS.SOLVES_REMOVE_REQUESTED]: SolveScopePayload & { solves: Solve[] };
[TIMER_EVENTS.SOLVES_REMOVED]: SolveResultPayload & { solves: Solve[] };
[TIMER_EVENTS.SOLVE_REQUEST_FAILED]: SolveResultPayload & {
  operation: SolveOperation;
  error: SolveFeatureError;
};
```

Remove the now-unused `SolveListQuery` import from the payload map.

- [ ] **Step 5: Update every compile-time/runtime fixture with explicit `sessionId` and result `requestId`**

For each solve request fixture in the listed files, add:

```ts
sessionId: 'session:one',
```

For each solve result fixture, also add:

```ts
requestId: 'request:one',
```

Do not change production behavior in this step.

- [ ] **Step 6: Run event typing and focused event tests**

Run:

```bash
pnpm exec vitest typecheck --run src/lib/events/timer/TimerEventTypes.test-d.ts
pnpm exec vitest run src/lib/events/timer/TimerEventFactory.test.ts src/lib/logger/EventLogger.test.ts src/lib/events/emitters/createTypedEventEmitter.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the event contract**

```bash
git add src/lib/events/timer src/lib/logger/EventLogger.test.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/timer/solves/SolveFeatureError.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts
git -c commit.gpgsign=false commit -m "feat: scope solve events to sessions"
```

---

### Task 2: Make Solve Emitters Session-Scoped

**Files:**
- Modify: `src/lib/events/emitters/solveEventEmitters.ts`
- Modify: `src/lib/events/emitters/solveEventEmitters.test.ts`

**Interfaces:**
- Consumes: solve request event payloads from Task 1.
- Produces: `requestList`, `requestAdd`, `requestUpdate`, and `requestRemove`, each requiring `{ ownerId, sessionId }` and returning `Promise<string>` request IDs.

- [ ] **Step 1: Replace emitter tests with explicit session assertions**

Update calls to this form:

```ts
await emitters.requestList({ ownerId: 'timer:1', sessionId: 'session-1' });
await emitters.requestAdd({ ownerId: 'timer:1', sessionId: 'session-1', solve });
await emitters.requestUpdate({ ownerId: 'timer:1', sessionId: 'session-1', solve });
await emitters.requestRemove({ ownerId: 'timer:1', sessionId: 'session-1', solves: [solve] });
```

Assert every observed payload contains `sessionId: 'session-1'`, and retain the native timestamp assertion.

- [ ] **Step 2: Run the emitter test and verify RED**

```bash
pnpm exec vitest run src/lib/events/emitters/solveEventEmitters.test.ts
```

Expected: FAIL because emitter input types and payloads still use optional queries or omit session scope.

- [ ] **Step 3: Replace the emitter input contracts and payload construction**

Use this base input:

```ts
interface SessionScopedEmitterInput {
  ownerId: string;
  sessionId: string;
  sourceEvent?: NativeTimestampSource;
}
```

Make list extend only that input; make add/update/remove add their existing solve fields. Publish payloads in this exact shape:

```ts
{ ownerId: input.ownerId, sessionId: input.sessionId }
{ ownerId: input.ownerId, sessionId: input.sessionId, solve: input.solve }
{ ownerId: input.ownerId, sessionId: input.sessionId, solves: input.solves }
```

Remove `SolveListQuery` from this emitter.

- [ ] **Step 4: Run the emitter tests**

```bash
pnpm exec vitest run src/lib/events/emitters/solveEventEmitters.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts
git -c commit.gpgsign=false commit -m "feat: add session-scoped solve emitters"
```

---

### Task 3: Publish Correlated Solve Results and Failures

**Files:**
- Modify: `src/lib/timer/solves/SolvePersistenceService.ts`
- Modify: `src/lib/timer/solves/SolvePersistenceService.test.ts`

**Interfaces:**
- Consumes: required `sessionId` request payloads; existing `SolvePersistencePort`.
- Produces: correlated result events with `requestId: request.id`, plus `SOLVE_REQUEST_FAILED` for expected port errors.

- [ ] **Step 1: Add failing correlation, session, and failure tests**

For list, add, update, and remove success assertions:

```ts
expect(observed.at(-1)?.payload).toMatchObject({
  ownerId: 'timer:one',
  sessionId: 'session:one',
  requestId: request.id,
});
```

Capture `request` before publishing. For example:

```ts
const request = events.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
  ownerId: 'timer:one',
  sessionId: 'session:one',
  solve: updatedSolve,
});
await bus.publish(request);
```

Add one representative failure test:

```ts
it('normalizes persistence failures into correlated solve failure events', async () => {
  const port: SolvePersistencePort = {
    loadSolves: vi.fn(),
    addSolve: vi.fn(),
    updateSolve: vi.fn(async () => { throw new Error('disk unavailable'); }),
    removeSolves: vi.fn(),
  };
  const { bus, events, observed, service } = createHarness(port);
  const request = events.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
    ownerId: 'timer:one',
    sessionId: 'session:one',
    solve: createSolve(),
  });

  await bus.publish(request);

  expect(observed.at(-1)).toMatchObject({
    type: TIMER_EVENTS.SOLVE_REQUEST_FAILED,
    payload: {
      ownerId: 'timer:one',
      sessionId: 'session:one',
      requestId: request.id,
      operation: 'update',
      error: {
        code: 'SOLVE_PERSISTENCE_FAILED',
        operation: 'update',
        message: 'disk unavailable',
      },
    },
  });
  service.destroy();
});
```

- [ ] **Step 2: Run the persistence tests and verify RED**

```bash
pnpm exec vitest run src/lib/timer/solves/SolvePersistenceService.test.ts
```

Expected: FAIL because results omit correlation/session fields and errors currently become generic handler failures.

- [ ] **Step 3: Add one private failure publisher and update handlers**

Import `normalizeSolveFeatureError` and add:

```ts
private async publishFailure(
  event: Extract<TimerEvent,
    { type:
      | typeof TIMER_EVENTS.SOLVES_LIST_REQUESTED
      | typeof TIMER_EVENTS.SOLVE_ADD_REQUESTED
      | typeof TIMER_EVENTS.SOLVE_UPDATE_REQUESTED
      | typeof TIMER_EVENTS.SOLVES_REMOVE_REQUESTED }>,
  operation: SolveOperation,
  error: unknown,
): Promise<void> {
  if (this.destroyed) return;
  await this.bus.publish(this.events.create(TIMER_EVENTS.SOLVE_REQUEST_FAILED, {
    ownerId: event.payload.ownerId,
    sessionId: event.payload.sessionId,
    requestId: event.id,
    operation,
    error: normalizeSolveFeatureError(error, operation),
  }));
}
```

Wrap each port call in `try/catch`. On success, publish the existing result with:

```ts
ownerId: event.payload.ownerId,
sessionId: event.payload.sessionId,
requestId: event.id,
```

Call `loadSolves({ sessionId: event.payload.sessionId })`. For add, send `{ ...event.payload.solve, session: event.payload.sessionId }` to the port.

- [ ] **Step 4: Run persistence tests**

```bash
pnpm exec vitest run src/lib/timer/solves/SolvePersistenceService.test.ts
```

Expected: PASS, including the failure case.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timer/solves/SolvePersistenceService.ts src/lib/timer/solves/SolvePersistenceService.test.ts
git -c commit.gpgsign=false commit -m "feat: correlate solve persistence results"
```

---

### Task 4: Add the Session-Scoped Solve Projection

**Files:**
- Create: `src/lib/timer/solves/SolveProjection.svelte.ts`
- Create: `src/lib/timer/solves/SolveProjection.test.ts`

**Interfaces:**
- Consumes: `EventBus<TimerEvent>`, `{ ownerId, sessionId }`, solve request/result/failure events.
- Produces: `createSolveProjection()`, readonly reactive `items/loading/error`, `consumeResult<T>(requestId)`, and idempotent `detach()`.

- [ ] **Step 1: Write projection tests**

Cover these exact behaviors using a real bus/factory:

```ts
it('projects only its owner and session', async () => {
  const projection = createSolveProjection({ bus, ownerId: 'timer:one', sessionId: 'session:one' });
  await bus.publish(events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
    ownerId: 'timer:two', sessionId: 'session:one', requestId: 'other-owner', solves: [first],
  }));
  await bus.publish(events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
    ownerId: 'timer:one', sessionId: 'session:two', requestId: 'other-session', solves: [second],
  }));
  await bus.publish(events.create(TIMER_EVENTS.SOLVES_LIST_LOADED, {
    ownerId: 'timer:one', sessionId: 'session:one', requestId: 'matching', solves: [first],
  }));
  expect(projection.items).toEqual([first]);
});
```

Also test: request sets `loading`; list replaces; add prepends; update replaces by `_id`; remove filters; failure sets `error`; `consumeResult()` returns and deletes the correlated `Result`; `detach()` twice is safe and prevents later changes.

- [ ] **Step 2: Run projection tests and verify RED**

```bash
pnpm exec vitest run src/lib/timer/solves/SolveProjection.test.ts
```

Expected: FAIL because the projection does not exist.

- [ ] **Step 3: Implement the projection**

Create a rune-backed class in `SolveProjection.svelte.ts` with this public shape:

```ts
export interface SolveProjection {
  readonly ownerId: string;
  readonly sessionId: string;
  readonly items: readonly Solve[];
  readonly loading: boolean;
  readonly error: SolveFeatureError | null;
  consumeResult<T>(requestId: string): Result<T, SolveFeatureError> | undefined;
  detach(): void;
}

export function createSolveProjection(input: {
  bus: EventBus<TimerEvent>;
  ownerId: string;
  sessionId: string;
}): SolveProjection;
```

Use `$state` fields for items/loading/error, a private `Map<string, Result<unknown, SolveFeatureError>>`, and `createEventModule()` for subscriptions. Subscribe to request events with priority `100` so loading becomes visible before persistence work. Each handler must first compare both `ownerId` and `sessionId`.

Store these outcomes:

```ts
SOLVES_LIST_LOADED -> Ok(undefined)
SOLVE_ADDED -> Ok(event.payload.solve)
SOLVE_UPDATED -> Ok(event.payload.solve)
SOLVES_REMOVED -> Ok(event.payload.solves)
SOLVE_REQUEST_FAILED -> Err(event.payload.error)
```

When accepting `SOLVES_LIST_LOADED`, defensively filter its array to `String(solve.session) === sessionId`; a faulty adapter must not contaminate a scoped projection.

- [ ] **Step 4: Run projection tests**

```bash
pnpm exec vitest run src/lib/timer/solves/SolveProjection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timer/solves/SolveProjection.svelte.ts src/lib/timer/solves/SolveProjection.test.ts
git -c commit.gpgsign=false commit -m "feat: add session-scoped solve projection"
```

---

### Task 5: Add the Hook-Style Solve Feature

**Files:**
- Create: `src/lib/timer/solves/SolveFeature.ts`
- Create: `src/lib/timer/solves/SolveFeature.test.ts`
- Create: `src/lib/timer/solves/useSolve.ts`
- Create: `src/lib/timer/solves/index.ts`
- Create: `src/lib/timer/context/timerRuntimeContext.ts`

**Interfaces:**
- Consumes: session-scoped solve emitters and projection.
- Produces: `SolveFeature`, `createSolveFeature()`, `useSolve(sessionIdSource)`, `setTimerRuntimeContext()`, and `getTimerRuntimeContext()`.

- [ ] **Step 1: Write facade tests**

Create a harness with the real bus, event factory, projection, and a test persistence service. Test:

```ts
await expect(feature.load()).resolves.toEqual(Ok(undefined));
await expect(feature.add({ time: 1000 })).resolves.toMatchObject({ ok: true });
await expect(feature.update(otherSessionSolve)).resolves.toEqual(Err(expect.objectContaining({
  code: 'SESSION_SCOPE_MISMATCH',
})));
expect(feature.items.every(solve => solve.session === 'session:one')).toBe(true);
```

Test remove rejects if any solve belongs to another session, failures return `Err`, and `destroy()` detaches the projection.

- [ ] **Step 2: Run facade tests and verify RED**

```bash
pnpm exec vitest run src/lib/timer/solves/SolveFeature.test.ts
```

Expected: FAIL because the feature does not exist.

- [ ] **Step 3: Implement `createSolveFeature()`**

Use this public contract:

```ts
export interface SolveFeature {
  readonly sessionId: string;
  readonly items: readonly Solve[];
  readonly loading: boolean;
  readonly error: SolveFeatureError | null;
  load(sourceEvent?: NativeTimestampSource): Promise<Result<void, SolveFeatureError>>;
  add(solve: Partial<Solve>, sourceEvent?: NativeTimestampSource): Promise<Result<Solve, SolveFeatureError>>;
  update(solve: Solve, sourceEvent?: NativeTimestampSource): Promise<Result<Solve, SolveFeatureError>>;
  remove(solves: readonly Solve[], sourceEvent?: NativeTimestampSource): Promise<Result<readonly Solve[], SolveFeatureError>>;
}

export interface InternalSolveFeature extends SolveFeature {
  destroy(): void;
}
```

The internal return also includes `destroy()`. Each command awaits the emitter request ID, then calls `projection.consumeResult<T>(requestId)`. If absent, return:

```ts
Err({
  code: 'SOLVE_RESPONSE_MISSING',
  operation,
  message: `No correlated ${operation} result for ${requestId}`,
})
```

For `add`, publish `{ ...solve, session: sessionId }`. Before update/remove, compare `String(solve.session)` with `sessionId` and return `SESSION_SCOPE_MISMATCH` without publishing when different.

Create `src/lib/timer/solves/index.ts` exporting `SolveFeature`, `SolveFeatureError`, `SolveProjection`, and `useSolve`.

- [ ] **Step 4: Add runtime context and the thin hook**

Create `timerRuntimeContext.ts`:

```ts
import { createContext } from 'svelte';
import type { TimerRuntime } from '../TimerCompositionRoot.svelte';

export const [getTimerRuntimeContext, setTimerRuntimeContext] = createContext<TimerRuntime>();
```

Create `useSolve.ts`:

```ts
export type SessionIdSource = string | (() => string);

export function useSolve(source: SessionIdSource): SolveFeature {
  const runtime = getTimerRuntimeContext();
  const sessionId = () => typeof source === 'function' ? source() : source;
  return {
    get sessionId() { return sessionId(); },
    get items() { return runtime.getSolveFeature(sessionId()).items; },
    get loading() { return runtime.getSolveFeature(sessionId()).loading; },
    get error() { return runtime.getSolveFeature(sessionId()).error; },
    load(native) { return runtime.getSolveFeature(sessionId()).load(native); },
    add(solve, native) { return runtime.getSolveFeature(sessionId()).add(solve, native); },
    update(solve, native) { return runtime.getSolveFeature(sessionId()).update(solve, native); },
    remove(solves, native) { return runtime.getSolveFeature(sessionId()).remove(solves, native); },
  };
}
```

- [ ] **Step 5: Run facade tests**

```bash
pnpm exec vitest run src/lib/timer/solves/SolveFeature.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/timer/solves src/lib/timer/context/timerRuntimeContext.ts
git -c commit.gpgsign=false commit -m "feat: add session-scoped solve facade"
```

---

### Task 6: Compose Solve Features in the Timer Runtime

**Files:**
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Modify: `src/lib/timer/Timer.svelte`

**Interfaces:**
- Consumes: `createSolveFeature()` and `SolveFeature` from Task 5.
- Produces: `TimerRuntime.getSolveFeature(sessionId: string): SolveFeature`; compatibility request methods delegate to the facade.

- [ ] **Step 1: Add failing runtime tests**

Add tests proving:

```ts
const first = runtime.getSolveFeature('session:one');
const same = runtime.getSolveFeature('session:one');
const second = runtime.getSolveFeature('session:two');
expect(same).toBe(first);
expect(second).not.toBe(first);
```

Load both sessions from an injectable port and assert their `items` never mix. Destroy the runtime, publish another result, and assert neither feature changes. Update existing solve-event expectations to include required `sessionId` and correlated `requestId`.

- [ ] **Step 2: Run runtime tests and verify RED**

```bash
pnpm exec vitest run src/lib/timer/TimerCompositionRoot.test.ts
```

Expected: FAIL because `getSolveFeature` does not exist and compatibility requests still construct old payloads.

- [ ] **Step 3: Add the feature cache and public getter**

In `TimerRuntime`, add:

```ts
getSolveFeature(sessionId: string): SolveFeature;
```

Inside `createTimerRuntime()` add:

```ts
const solveFeatures = new Map<string, InternalSolveFeature>();

function getSolveFeature(sessionId: string): SolveFeature {
  if (!sessionId) throw new Error('useSolve requires a sessionId');
  let feature = solveFeatures.get(sessionId);
  if (!feature) {
    feature = createSolveFeature({
      bus: application.bus,
      events: application.events,
      ownerId,
      sessionId,
    });
    solveFeatures.set(sessionId, feature);
  }
  return feature;
}
```

Return the getter. During `destroy()`, destroy every internal feature and clear the map before destroying the owned application runtime.

- [ ] **Step 4: Delegate compatibility solve methods**

Keep the current public methods temporarily, but implement them through `getSolveFeature()`:

```ts
requestSolveAdd(solve, native) {
  const sessionId = String(solve.session ?? state.session?._id ?? '');
  if (!sessionId) return Promise.resolve();
  return getSolveFeature(sessionId).add(solve, native).then(() => undefined);
}
requestSolveUpdate(solve, native) {
  return getSolveFeature(String(solve.session)).update(solve, native).then(() => undefined);
}
requestSolvesRemove(solves, native) {
  if (solves.length === 0) return Promise.resolve();
  const sessionId = String(solves[0].session);
  return getSolveFeature(sessionId).remove(solves, native).then(() => undefined);
}
requestSolvesList(query, native) {
  return getSolveFeature(String(query.sessionId)).load(native).then(result =>
    result.ok ? [...getSolveFeature(String(query.sessionId)).items] : []
  );
}
```

Change `requestSolvesList` to require `{ sessionId: string }`. Existing production callers already provide the route session ID.

- [ ] **Step 5: Provide the runtime context from `Timer.svelte`**

Immediately after `createTimerRuntime(...)`, call:

```ts
setTimerRuntimeContext(eventTimerRuntime);
```

Add only the new import and context call. Do not migrate `HistoryTab`, remove legacy context fields, or touch the user's dirty files in this task.

- [ ] **Step 6: Run runtime and lifecycle integration tests**

```bash
pnpm exec vitest run src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/Timer.svelte
git -c commit.gpgsign=false commit -m "feat: compose session-scoped solve features"
```

---

### Task 7: Add Boundary Contracts and Verify the Slice

**Files:**
- Create: `src/lib/timer/SolveFeatureBoundary.contract.test.ts`
- Modify: `docs/architecture/timer/solves.md`

**Interfaces:**
- Consumes: all APIs from Tasks 1–6.
- Produces: regression guardrails and current architecture documentation; no UI migration.

- [ ] **Step 1: Add a source boundary test**

The test reads `solves/useSolve.ts` and asserts it delegates through `getTimerRuntimeContext()` and `getSolveFeature()`. It reads the new solve feature files and asserts no import from `dataService`, `SolveController`, browser IPC, or Electron IPC. It reads `HistoryTab.svelte` only to document that migration remains pending; do not assert removal of its current context yet.

```ts
expect(featureSource).not.toMatch(/dataService|SolveController|solveIPC\.(browser|electron)/);
expect(hookSource).toContain('getTimerRuntimeContext');
expect(hookSource).toContain('getSolveFeature');
```

- [ ] **Step 2: Run the boundary test**

```bash
pnpm exec vitest run src/lib/timer/SolveFeatureBoundary.contract.test.ts
```

Expected: PASS.

- [ ] **Step 3: Update solve architecture documentation**

Document the implemented flow:

```text
useSolve(sessionId)
  -> session-scoped request event
  -> application SolvePersistenceService
  -> correlated result/failure event
  -> { ownerId, sessionId } SolveProjection
  -> reactive facade getters
```

State explicitly that `HistoryTab` migration is the next slice and that no unscoped solve collection exists.

- [ ] **Step 4: Run all focused tests and quality checks**

```bash
pnpm exec vitest typecheck --run src/lib/events/timer/TimerEventTypes.test-d.ts
pnpm exec vitest run src/lib/events/timer/TimerEventFactory.test.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/timer/solves/SolvePersistenceService.test.ts src/lib/timer/solves/SolveProjection.test.ts src/lib/timer/solves/SolveFeature.test.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts src/lib/timer/SolveFeatureBoundary.contract.test.ts
pnpm exec prettier --check src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/timer/TimerEventTypes.test-d.ts src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/timer/solves src/lib/timer/context/timerRuntimeContext.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/Timer.svelte src/lib/timer/SolveFeatureBoundary.contract.test.ts docs/architecture/timer/solves.md
pnpm exec eslint src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/timer/solves src/lib/timer/context/timerRuntimeContext.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/SolveFeatureBoundary.contract.test.ts
```

Expected: all commands PASS. Do not build and do not run `svelte-check`.

- [ ] **Step 5: Confirm user files remain preserved**

Run:

```bash
git status --short
git diff -- src/lib/timer/HistoryTab/HistoryTab.svelte src/lib/timer/TimerRegression.contract.test.ts
```

Expected: the user's pre-existing changes remain present and were not included in any task commit.

- [ ] **Step 6: Commit documentation and guardrails**

```bash
git add src/lib/timer/SolveFeatureBoundary.contract.test.ts docs/architecture/timer/solves.md
git -c commit.gpgsign=false commit -m "docs: record session-scoped solve feature"
```

## Plan Self-Review

- **Spec coverage:** session ownership, feature-facade isolation, event correlation, typed failures, projection scoping, runtime teardown, environment independence, compatibility wiring, tests, and no UI/Figma regression are mapped to Tasks 1–7.
- **Scope:** this plan stops before `HistoryTab` migration so the infrastructure is independently reviewable and the user's dirty files remain untouched.
- **Type consistency:** `sessionId` is always `string`; request IDs are event-envelope IDs; all facade commands return `Promise<Result<...>>`; one generic solve failure event carries `SolveOperation` and `SolveFeatureError`.
- **No placeholders:** every task contains exact files, commands, expected results, and implementation contracts.

## Next Slice

After manual approval of this foundation, migrate `HistoryTab.svelte` to `useSolve(() => session.current._id)`, remove solve callbacks from `TimerContext`, and preserve the current History/Figma behavior.
