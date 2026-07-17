# Event-Driven Scramble and Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move timer scramble and preview generation behind owner-scoped typed events while preserving the current generator behind a reversible migration flag.

**Architecture:** The application runtime owns independent `ScrambleService` and `ScramblePreviewService` instances. Timer-local handlers project only current owner/request results into `TimerState`; the existing timer context remains a temporary UI/legacy-device bridge. Preview work starts after scramble projection and never blocks scramble display.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest, the existing typed `EventBus`, CSTimer scramble generation, `scrambleToPuzzle`, and `pGenerateCubeBundle`.

## Global Constraints

- Work directly on the current branch as PR-sized commit groups.
- Before each execution group, tell the user exactly what will change and wait for approval.
- After each production-visible group, stop so the user can test `/timer/<sessionId>`.
- Do not run a build.
- Do not run `svelte-check`.
- Every changed component receives focused tests in the same commit group.
- Preserve browser `Event.timeStamp` for direct click and keyboard requests.
- Programmatic events use the injected monotonic clock.
- Keep high-frequency timer readings on the existing direct callback.
- Do not migrate solve persistence, statistics, or penalty editing in this slice.
- Keep `TimerController.initScrambler` and `TimerController.updateImage` as the tested rollback path.
- Do not add persistent preview caching.
- Do not edit or stage `src/lib/timer/ManagedKeyboardUi.test.ts` or `src/lib/timer/TimerTab/timer-handlers/KeyboardInputHandler.svelte` as part of a scramble commit.
- Execution precondition: the user must first accept the inspection display fix, then commit those two files separately as `fix: hide negative inspection boundary before dnf`.

## Execution Groups

| Group | Tasks | Visible production change | Required checkpoint |
|---|---|---|---|
| A: Contracts and isolated services | 1-3 | None; flag remains disabled | Report focused tests and event contracts |
| B: Projection and runtime composition | 4-6 | Runtime capability exists, UI still uses legacy bridge | Report integration tests and lifecycle behavior |
| C: Production bridge and diagnostics | 7-8 | Event-driven scramble/preview enabled in timer UI | Stop for manual acceptance |

---

### Task 1: Freeze Scramble, Preview, and Cancellation Contracts

**Files:**
- Create: `src/lib/events/timer/ScrambleEventTypes.ts`
- Modify: `src/lib/events/timer/TimerEventRegistry.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/TimerEventTypes.test-d.ts`
- Modify: `src/lib/events/timer/TimerEventFactory.test.ts`
- Modify: `src/lib/timer/TimerMigrationFlags.ts`
- Create: `src/lib/timer/TimerMigrationFlags.test.ts`
- Modify: `src/lib/timer/devices/KeyboardDevice.ts`
- Modify: `src/lib/timer/devices/KeyboardDevice.test.ts`
- Modify: `src/lib/timer/TimerReactor.test.ts`

**Interfaces:**
- Produces: `ScrambleRequestSource`, `ScramblePreviewClearReason`, `ScrambleProbability`, and typed payloads used by every later task.
- Changes: `DEVICE_RUN_CANCELLED` requires `cancelledFrom: TimerState` so cancellation triggers never infer the previous phase from mutable state.

- [ ] **Step 1: Write failing compile-time and runtime contract tests**

Add valid calls and `@ts-expect-error` cases equivalent to:

```ts
factory.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, {
  ownerId: 'timer:one',
  mode: '333',
  length: 0,
  probability: [1, 2],
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
});

factory.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED, {
  ownerId: 'timer:one',
  scrambleRequestId: 'scramble-1',
  requestId: 'preview-1',
  images: ['data:image/svg+xml,test'],
  attemptsUsed: 2,
});

// @ts-expect-error results must identify their owner and request.
factory.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
  scramble: 'R U', mode: '333', length: 0, probability: -1,
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
});
```

Test `DEFAULT_TIMER_MIGRATION_FLAGS.scramble === false` and an override with `{ scramble: true }`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
pnpm exec tsc --noEmit -p tsconfig.json --pretty false
pnpm exec vitest run src/lib/events/timer/TimerEventFactory.test.ts src/lib/timer/TimerMigrationFlags.test.ts src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/TimerReactor.test.ts
```

Expected: TypeScript reports missing event/type definitions and Vitest reports the missing `scramble` flag or cancellation phase.

- [ ] **Step 3: Add the closed constants and payload definitions**

Create:

```ts
export const SCRAMBLE_REQUEST_SOURCES = {
  SOLVE_COMPLETED: 'solve-completed',
  USER_REQUESTED: 'user-requested',
  RUNNING_CANCELLED: 'running-cancelled',
  SESSION_SCRAMBLE_SETTINGS_CHANGED: 'session-scramble-settings-changed',
} as const;

export type ScrambleRequestSource =
  (typeof SCRAMBLE_REQUEST_SOURCES)[keyof typeof SCRAMBLE_REQUEST_SOURCES];
export type ScrambleProbability = number | number[];

export interface ScrambleRequestInput {
  mode: string;
  length: number;
  probability: ScrambleProbability;
  source: ScrambleRequestSource;
  providedScramble?: string;
}

export const SCRAMBLE_PREVIEW_CLEAR_REASONS = {
  NEW_SCRAMBLE: 'new-scramble',
  IMAGES_DISABLED: 'images-disabled',
  UNSUPPORTED_MODE: 'unsupported-mode',
  GENERATION_FAILED: 'generation-failed',
} as const;

export type ScramblePreviewClearReason =
  (typeof SCRAMBLE_PREVIEW_CLEAR_REASONS)[keyof typeof SCRAMBLE_PREVIEW_CLEAR_REASONS];

export interface NormalizedScrambleError {
  name: string;
  message: string;
}
```

Add these exact registry values:

```ts
SCRAMBLE_PREVIEW_REQUESTED: 'timer.scramble-preview.requested',
SCRAMBLE_PREVIEW_GENERATED: 'timer.scramble-preview.generated',
SCRAMBLE_PREVIEW_GENERATION_FAILED: 'timer.scramble-preview.generation-failed',
SCRAMBLE_PREVIEW_CLEARED: 'timer.scramble-preview.cleared',
```

Replace the incomplete scramble payloads with:

```ts
[TIMER_EVENTS.SCRAMBLE_REQUESTED]: ScrambleRequestInput & { ownerId: string };
[TIMER_EVENTS.SCRAMBLE_GENERATED]: ScrambleRequestInput & {
  ownerId: string;
  requestId: string;
  scramble: string;
};
[TIMER_EVENTS.SCRAMBLE_GENERATION_FAILED]: ScrambleRequestInput & {
  ownerId: string;
  requestId: string;
  errors: Array<{ generatorId: string; error: NormalizedScrambleError }>;
};
[TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED]: {
  ownerId: string;
  scrambleRequestId: string;
  scramble: string;
  mode: string;
};
[TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED]: {
  ownerId: string;
  scrambleRequestId: string;
  requestId: string;
  images: string[];
  attemptsUsed: number;
};
[TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATION_FAILED]: {
  ownerId: string;
  scrambleRequestId: string;
  requestId: string;
  attemptsUsed: number;
  error: NormalizedScrambleError;
};
[TIMER_EVENTS.SCRAMBLE_PREVIEW_CLEARED]: {
  ownerId: string;
  scrambleRequestId?: string;
  reason: ScramblePreviewClearReason;
};
```

Add `scramble: boolean` to `TimerMigrationFlags` and its frozen default.

Make `cancelledFrom` required and update the keyboard publisher plus existing tests in the same commit so the repository remains type-correct:

```ts
context.events.fromNative(
  TIMER_EVENTS.DEVICE_RUN_CANCELLED,
  {
    ownerId: context.ownerId,
    deviceId: TIMER_DEVICE_IDS.KEYBOARD,
    cancelledFrom: context.view.state,
  },
  nativeTimestamp(event.timestamp),
);
```

- [ ] **Step 4: Run focused verification**

Run the Step 2 commands again. Expected: TypeScript and all four focused Vitest files pass.

- [ ] **Step 5: Commit only contract files**

```powershell
git add src/lib/events/timer/ScrambleEventTypes.ts src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/timer/TimerEventTypes.test-d.ts src/lib/events/timer/TimerEventFactory.test.ts src/lib/timer/TimerMigrationFlags.ts src/lib/timer/TimerMigrationFlags.test.ts src/lib/timer/devices/KeyboardDevice.ts src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/TimerReactor.test.ts
git -c commit.gpgsign=false commit -m "feat: define scramble preview event contracts"
```

---

### Task 2: Implement the Autonomous Scramble Service

**Files:**
- Create: `src/lib/timer/scramble/IScrambleGenerator.ts`
- Create: `src/lib/timer/scramble/normalizeScramble.ts`
- Create: `src/lib/timer/scramble/CSTimerScrambleGenerator.ts`
- Create: `src/lib/timer/scramble/ScrambleService.ts`
- Create: `src/lib/timer/scramble/ScrambleService.test.ts`
- Create: `src/lib/timer/scramble/CSTimerScrambleGenerator.test.ts`
- Create: `src/lib/timer/scramble/index.ts`

**Interfaces:**
- Consumes: typed scramble request/result events from Task 1.
- Produces:

```ts
export interface ScrambleGeneratorRequest {
  mode: string;
  length: number;
  probability: ScrambleProbability;
}

export interface IScrambleGenerator {
  readonly id: string;
  supports(mode: string): boolean;
  generate(request: ScrambleGeneratorRequest): string | null | Promise<string | null>;
}
```

- [ ] **Step 1: Write failing service and adapter tests**

Cover: provided scramble bypasses generators; unsupported generators are skipped; null/throw advances priority; first success is normalized and published; all failures publish ordered normalized errors; overlapping requests can finish out of order; `destroy()` suppresses later publication.

Use deferred promises and a real bus:

```ts
const service = new ScrambleService(bus, events, [first, second], normalize);
await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, request));
expect(generated).toMatchObject({
  payload: { ownerId: 'timer:one', requestId: requestEvent.id, scramble: 'R U' },
});
```

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/scramble/ScrambleService.test.ts src/lib/timer/scramble/CSTimerScrambleGenerator.test.ts
```

Expected: FAIL because the service and adapter do not exist.

- [ ] **Step 3: Implement minimal generator adapter and non-blocking service**

`CSTimerScrambleGenerator` wraps `getScramble`; `normalizeScramble` preserves the existing `isNNN`/`ScrambleParser.parseNNNString`/`prettyScramble` sequence. The subscription must start work without awaiting it so one slow generator does not block EventBus delivery:

```ts
this.subscription = bus.subscribe(
  TIMER_EVENTS.SCRAMBLE_REQUESTED,
  'scramble-service:generate',
  event => { void this.generate(event); },
);
```

The async method publishes `SCRAMBLE_GENERATED` with `requestId: event.id`, or one `SCRAMBLE_GENERATION_FAILED` after every supported generator fails. Guard every result with `if (this.destroyed) return`.

- [ ] **Step 4: Run focused tests and lint**

```powershell
pnpm exec vitest run src/lib/timer/scramble/ScrambleService.test.ts src/lib/timer/scramble/CSTimerScrambleGenerator.test.ts
pnpm exec eslint src/lib/timer/scramble src/lib/events/timer
```

Expected: all focused tests and ESLint pass.

- [ ] **Step 5: Commit the scramble service**

```powershell
git add src/lib/timer/scramble
git -c commit.gpgsign=false commit -m "feat: generate scrambles from application events"
```

---

### Task 3: Implement Retrying Preview Generation

**Files:**
- Create: `src/lib/timer/scramble/IScramblePreviewGenerator.ts`
- Create: `src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.ts`
- Create: `src/lib/timer/scramble/ScramblePreviewService.ts`
- Create: `src/lib/timer/scramble/ScramblePreviewService.test.ts`
- Create: `src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.test.ts`
- Modify: `src/lib/timer/scramble/index.ts`

**Interfaces:**

```ts
export interface IScramblePreviewGenerator {
  supports(mode: string): boolean;
  generate(scramble: string, mode: string): Promise<string[]>;
}

export const SCRAMBLE_PREVIEW_MAX_ATTEMPTS = 3;
```

- [ ] **Step 1: Write failing preview tests**

Cover supported first-attempt success, second/third-attempt success, exactly three calls on total failure, unsupported mode clearing without failure, correct request IDs, no persistent-cache option, overlapping requests, and suppression after destroy.

```ts
expect(generator.generate).toHaveBeenCalledTimes(3);
expect(failures.at(-1)?.payload).toMatchObject({ attemptsUsed: 3 });
expect(cleared.at(-1)?.payload.reason)
  .toBe(SCRAMBLE_PREVIEW_CLEAR_REASONS.GENERATION_FAILED);
```

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/scramble/ScramblePreviewService.test.ts src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.test.ts
```

Expected: FAIL because the preview service and adapter do not exist.

- [ ] **Step 3: Implement three-attempt non-blocking generation**

The adapter calls:

```ts
const cubes = scrambleToPuzzle(scramble, mode);
return pGenerateCubeBundle(cubes, 500, false, false, false);
```

The service subscribes to `SCRAMBLE_PREVIEW_REQUESTED`, starts an unawaited async task, retries immediately, publishes success with `attemptsUsed`, or publishes final failure followed by `SCRAMBLE_PREVIEW_CLEARED`. Unsupported modes publish only a cleared fact.

- [ ] **Step 4: Run focused tests and lint**

```powershell
pnpm exec vitest run src/lib/timer/scramble/ScramblePreviewService.test.ts src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.test.ts
pnpm exec eslint src/lib/timer/scramble
```

Expected: all focused tests and ESLint pass.

- [ ] **Step 5: Commit the preview service and stop for Group A review**

```powershell
git add src/lib/timer/scramble
git -c commit.gpgsign=false commit -m "feat: generate scramble previews with bounded retries"
```

Report the three commits, exact focused-test results, typed event examples, and that production remains unchanged. Wait for user approval before Group B.

---

### Task 4: Project Current Scramble and Preview State

**Files:**
- Modify: `src/lib/timer/TimerState.svelte.ts`
- Modify: `src/lib/timer/TimerState.test.ts`
- Create: `src/lib/timer/handlers/registerScrambleHandlers.ts`
- Create: `src/lib/timer/handlers/registerScrambleHandlers.test.ts`

**Interfaces:**
- Produces: `registerScrambleHandlers(bus, events, state, ownerId): EventSubscription`.
- Adds state fields: `scrambleMode`, `scrambleLength`, `scrambleProbability`, `scrambleRequestId`, `scramblePreview`, `scramblePreviewRequestId`, and `scramblePreviewEnabled`.

- [ ] **Step 1: Write failing state and handler tests**

Test owner filtering, latest scramble request tracking, stale scramble failure/result rejection, immediate old-preview clearing, preview request publication when `session.settings.genImage` is true, preview ID tracking, disabled/unsupported/failure clearing, stale preview rejection, and unsubscribe behavior.

```ts
await bus.publish(scrambleRequested);
await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
  ownerId: 'timer:one',
  requestId: scrambleRequested.id,
  scramble: 'R U',
  mode: '333',
  length: 0,
  probability: -1,
  source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
}));
expect(state.scramble).toBe('R U');
expect(state.scramblePreview).toEqual([]);
```

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/TimerState.test.ts src/lib/timer/handlers/registerScrambleHandlers.test.ts
```

Expected: FAIL on missing fields and handler.

- [ ] **Step 3: Implement owner/request-gated projections**

Register projection handlers at priority `100` so request IDs are recorded before application services start work. On accepted `SCRAMBLE_GENERATED`, update scramble configuration, clear the old preview, and—only when the active session has `genImage`—queue `SCRAMBLE_PREVIEW_REQUESTED`. Never update state in a service.

- [ ] **Step 4: Run focused verification**

```powershell
pnpm exec vitest run src/lib/timer/TimerState.test.ts src/lib/timer/handlers/registerScrambleHandlers.test.ts
pnpm exec eslint src/lib/timer/TimerState.svelte.ts src/lib/timer/handlers/registerScrambleHandlers.ts src/lib/timer/handlers/registerScrambleHandlers.test.ts
```

Expected: tests and ESLint pass.

- [ ] **Step 5: Commit projections**

```powershell
git add src/lib/timer/TimerState.svelte.ts src/lib/timer/TimerState.test.ts src/lib/timer/handlers/registerScrambleHandlers.ts src/lib/timer/handlers/registerScrambleHandlers.test.ts
git -c commit.gpgsign=false commit -m "feat: project owner-scoped scramble preview state"
```

---

### Task 5: Compose Services and Owner Runtime Commands

**Files:**
- Modify: `src/lib/timer/TimerApplicationRuntime.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`

**Interfaces:**
- Application options accept injected `scrambleGenerators` and `scramblePreviewGenerator` fakes.
- `TimerRuntime` adds:

```ts
requestScramble(input: ScrambleRequestInput, nativeEvent?: NativeTimestampSource): Promise<string>;
setScramblePreviewEnabled(enabled: boolean, nativeEvent?: NativeTimestampSource): Promise<void>;
```

- [ ] **Step 1: Write failing composition tests**

Assert the application owns one instance of each service, multiple timer owners share them, runtime requests use native timestamps when supplied, timer destroy unregisters projections, application destroy stops services idempotently, and disabling preview invalidates a pending result.

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts
```

Expected: FAIL on missing services and runtime methods.

- [ ] **Step 3: Wire services and commands**

Create default CSTimer/cube-bundle adapters in `createTimerApplicationRuntime`, while allowing deterministic injected fakes. Construct timer-local scramble handlers in `createTimerRuntime` and destroy them with the reactor.

Implement requests by creating the envelope before publication:

```ts
const event = nativeEvent
  ? application.events.fromNative(TIMER_EVENTS.SCRAMBLE_REQUESTED, payload, nativeEvent)
  : application.events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, payload);
await application.bus.publish(event);
return event.id;
```

Disabling preview publishes `SCRAMBLE_PREVIEW_CLEARED` with `IMAGES_DISABLED`; enabling it publishes a request for the current accepted scramble without requesting a different scramble.

- [ ] **Step 4: Run focused verification**

```powershell
pnpm exec vitest run src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts
pnpm exec tsc --noEmit -p tsconfig.json --pretty false
```

Expected: focused tests and TypeScript pass.

- [ ] **Step 5: Commit runtime composition**

```powershell
git add src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts
git -c commit.gpgsign=false commit -m "feat: compose scramble services in timer runtime"
```

---

### Task 6: Publish Lifecycle-Driven Scramble Requests

**Files:**
- Modify: `src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Create: `src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts`

**Interfaces:**
- `TimerRuntimeOptions` gains `getScrambleRequest(): ScrambleRequestInput` for the temporary controller/session bridge.
- Completion and cancellation triggers call the runtime request command, never a service directly.

- [ ] **Step 1: Write failing lifecycle tests**

Cover: completed stop invokes `onRunStopped` before `SCRAMBLE_REQUESTED`; running cancellation requests only when the Task 1 `cancelledFrom` value is `RUNNING` and `scrambleAfterCancel` is true; prevention and inspection cancellation never request; automatic inspection DNF counts as a completed stop; other owners are ignored.

```ts
expect(order).toEqual(['legacy-save', 'scramble-requested']);
expect(request.payload.source).toBe(SCRAMBLE_REQUEST_SOURCES.SOLVE_COMPLETED);
```

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts
```

Expected: FAIL because lifecycle-driven scramble triggers are absent.

- [ ] **Step 3: Add ordered lifecycle triggers**

In the owner runtime, register completion/cancellation trigger subscriptions after the legacy completion subscription. Invoke `onRunStopped` first, then publish `SOLVE_COMPLETED`. For cancellation, require `cancelledFrom === TimerState.RUNNING` and `state.session?.settings.scrambleAfterCancel === true`.

- [ ] **Step 4: Run focused tests and TypeScript**

```powershell
pnpm exec vitest run src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts
pnpm exec tsc --noEmit -p tsconfig.json --pretty false
```

Expected: all focused tests and TypeScript pass.

- [ ] **Step 5: Commit lifecycle triggers and stop for Group B review**

```powershell
git add src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts
git -c commit.gpgsign=false commit -m "feat: request scrambles from timer lifecycle events"
```

Report focused/integration results and the exact stop/cancel event sequences. Wait for user approval before production activation.

---

### Task 7: Activate the Reversible Timer UI Bridge

**Files:**
- Create: `src/lib/timer/scramble/createScrambleRequestInput.ts`
- Create: `src/lib/timer/scramble/createScrambleRequestInput.test.ts`
- Modify: `src/lib/timer/context/timerContext.ts`
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerTab/TimerOptions.svelte`
- Modify: `src/lib/timer/TimerTab/TimerOptionsTooltip.test.ts`
- Create: `src/lib/timer/ScrambleUiBridge.test.ts`
- Modify: `src/lib/timer/ManagedKeyboardUi.test.ts` only after its prerequisite commit makes the file clean

**Interfaces:**
- The context bridge keeps positional compatibility and adds native input/source parameters:

```ts
initScrambler(
  scramble?: string,
  mode?: string,
  probability?: number | number[],
  nativeEvent?: Pick<Event, 'timeStamp'>,
  source?: ScrambleRequestSource,
): void;
```

- The resolver accepts and returns exact typed values:

```ts
export interface ScrambleRequestResolutionInput {
  selectedMode: { 0: string; 1: string; 2: number };
  selectedProbability: number | number[];
  modeOverride?: string;
  lengthOverride?: number;
  probabilityOverride?: number | number[];
  providedScramble?: string;
  source: ScrambleRequestSource;
}

export function createScrambleRequestInput(
  input: ScrambleRequestResolutionInput,
): ScrambleRequestInput;
```

- [ ] **Step 1: Write failing resolver and source-inspection tests**

Test current `useMode`, `useLen`, `useProb`, random-state `r3/r3ni`, user-provided scramble, and default controller mode/prob resolution. Source tests must verify refresh click and Ctrl+S pass their native event; edit save passes its click/keyboard confirmation event; session mode/prob changes use `SESSION_SCRAMBLE_SETTINGS_CHANGED`; preview setting changes do not call scramble generation.

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/timer/scramble/createScrambleRequestInput.test.ts src/lib/timer/ScrambleUiBridge.test.ts src/lib/timer/TimerTab/TimerOptionsTooltip.test.ts
```

Expected: FAIL on the missing resolver and native-event bridge.

- [ ] **Step 3: Implement and enable the production bridge**

In `Timer.svelte`, enable `flags: { keyboard: true, scramble: true }`, supply `getScrambleRequest`, and route the context method by flag:

```ts
if (eventTimerRuntime.flags.scramble) {
  const selectedProbability = get(timerController.prob);
  const input = createScrambleRequestInput({
    selectedMode: get(timerController.mode),
    selectedProbability,
    modeOverride: useMode || mode,
    lengthOverride: useLen || undefined,
    probabilityOverride: useProb !== -1
      ? useProb
      : probability !== undefined && probability !== -1
        ? probability
        : undefined,
    providedScramble: useScramble || scr || undefined,
    source: source ?? SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
  });
  void eventTimerRuntime.requestScramble(input, nativeEvent);
  return;
}
timerController.initScrambler(MENU, env, scr, mode, probability);
```

Bridge accepted event state into the still-legacy UI stores:

```ts
timerController.scramble.set(eventTimerRuntime.state.scramble);
timerController.preview.set(
  eventTimerRuntime.state.scramblePreview.map(src => ({ src, alt: '', title: '' })),
);
```

Use a guarded effect comparing accepted mode/probability with the selected session configuration for initial/session-change requests. A separate effect calls `setScramblePreviewEnabled` when `genImage` changes; it must never request a new scramble.

Update every direct UI boundary—refresh button, Ctrl+S, edit confirmation, old-scramble selection, and seed update—to pass its actual `MouseEvent` or `KeyboardEvent` before any async boundary.

- [ ] **Step 4: Run UI-focused tests, TypeScript, and lint**

```powershell
pnpm exec vitest run src/lib/timer/scramble/createScrambleRequestInput.test.ts src/lib/timer/ScrambleUiBridge.test.ts src/lib/timer/TimerTab/TimerOptionsTooltip.test.ts src/lib/timer/ManagedKeyboardUi.test.ts
pnpm exec tsc --noEmit -p tsconfig.json --pretty false
pnpm exec eslint src/lib/timer/Timer.svelte src/lib/timer/TimerTab/TimerOptions.svelte src/lib/timer/context/timerContext.ts src/lib/timer/scramble
```

Expected: all focused tests, TypeScript, and ESLint pass.

- [ ] **Step 5: Commit production activation**

```powershell
git add src/lib/timer/scramble/createScrambleRequestInput.ts src/lib/timer/scramble/createScrambleRequestInput.test.ts src/lib/timer/context/timerContext.ts src/lib/timer/Timer.svelte src/lib/timer/TimerTab/TimerOptions.svelte src/lib/timer/TimerTab/TimerOptionsTooltip.test.ts src/lib/timer/ScrambleUiBridge.test.ts src/lib/timer/ManagedKeyboardUi.test.ts
git -c commit.gpgsign=false commit -m "feat: activate event-driven scramble preview flow"
```

---

### Task 8: Add Diagnostics, Reconcile Documentation, and Verify the Slice

**Files:**
- Modify: `src/lib/components/EventDebugPanel.svelte`
- Modify: `src/lib/components/EventDebugPanel.test.ts`
- Create: `src/lib/timer/ScrambleFlow.integration.test.ts`
- Modify: `docs/architecture/timer/scramble.md`
- Modify: `docs/architecture/core/services.md`
- Modify: `docs/architecture/timer/handlers.md`
- Modify: `CLARIFICATIONS_INCORPORATED.md`

**Interfaces:**
- No new production boundary. This task proves and documents the completed slice.

- [ ] **Step 1: Write failing debugger and end-to-end tests**

Add dedicated visual classifications for scramble request/success/failure and preview request/success/failure/cleared. The integration test uses a real bus with delayed fakes to prove scramble projection precedes preview completion, newest rapid request wins, owners remain isolated, disabling images rejects pending output, and timestamps/IDs remain intact.

- [ ] **Step 2: Run tests to verify RED**

```powershell
pnpm exec vitest run src/lib/components/EventDebugPanel.test.ts src/lib/timer/ScrambleFlow.integration.test.ts
```

Expected: FAIL on missing debugger mappings and final flow wiring.

- [ ] **Step 3: Add diagnostics and reconcile old diagrams**

Add icon mappings using existing Lucide components, for example:

```ts
if (type.endsWith('scramble.requested'))
  return { icon: RefreshCw, color: 'text-info', label: 'Scramble requested' };
if (type.endsWith('scramble.generated'))
  return { icon: Shuffle, color: 'text-success', label: 'Scramble generated' };
if (type.includes('scramble-preview') && type.endsWith('generation-failed'))
  return { icon: ImageOff, color: 'text-warning', label: 'Preview failed' };
```

Update the older architecture documents so they point to the approved design and no longer claim mode/probability deduplication suppresses the next scramble after an ordinary solve, combine image work into scramble generation, use an empty fallback, or regenerate a scramble when only `genImage` changes.

- [ ] **Step 4: Run full verification without a build or `svelte-check`**

```powershell
pnpm exec eslint .
pnpm exec tsc --noEmit -p tsconfig.json --pretty false
$env:NODE_OPTIONS='--max-old-space-size=1024'; pnpm test:unit --run --maxWorkers=1
git diff --check
```

Expected: ESLint exits 0, TypeScript exits 0, every unit/integration test passes, and `git diff --check` reports no whitespace errors. LF-to-CRLF notices are warnings, not failures.

- [ ] **Step 5: Commit diagnostics and documentation**

```powershell
git add src/lib/components/EventDebugPanel.svelte src/lib/components/EventDebugPanel.test.ts src/lib/timer/ScrambleFlow.integration.test.ts docs/architecture/timer/scramble.md docs/architecture/core/services.md docs/architecture/timer/handlers.md CLARIFICATIONS_INCORPORATED.md
git -c commit.gpgsign=false commit -m "test: verify event-driven scramble preview flow"
```

- [ ] **Step 6: Stop for production-route acceptance**

Tell the user to test `/timer/<sessionId>` in this order:

1. Initial scramble appears before its preview.
2. Refresh button and Ctrl+S produce native-timestamp request events.
3. Edited and old scrambles receive matching previews.
4. A completed solve saves through the legacy bridge, then advances the scramble.
5. Running Escape advances only with `scrambleAfterCancel`; inspection cancellation never advances.
6. Switching to a different mode/probability advances exactly once.
7. Disabling images clears only the preview; enabling regenerates only the current preview.
8. Rapid refreshes leave the newest scramble and preview visible.
9. Event console shows request/result/failure categories with owner and request IDs.

Do not begin solve persistence or another device migration until the user accepts this route behavior.

## Rollback

Immediate runtime rollback: set the timer's `scramble` migration flag to `false`. This returns all context calls to `TimerController.initScrambler` while leaving contracts and services inert.

Commit rollback order:

1. Revert Task 8 diagnostics/docs.
2. Revert Task 7 production activation; the application returns to the legacy path.
3. Revert Tasks 6 through 1 in reverse order only if the unused event-driven capability must also be removed.

Never partially revert the event payload map without also reverting its type tests and every publisher/subscriber introduced after it.
