# Event-Driven Scramble Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scrambles visible and fully usable through the application-scoped event bus before connecting preview generation.

**Architecture:** The application runtime owns one `ScrambleService`. Each timer runtime publishes owner-scoped requests and projects only results matching its latest request ID. `Timer.svelte` resolves legacy session/override inputs at the UI boundary, requests the initial and manually selected scramble through the runtime, and mirrors the accepted projection into the existing display store. Preview generation remains disconnected.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest, existing typed `EventBus`, and CSTimer.

## Global Constraints

- Work directly on the current `newdesign` branch.
- Do not build and do not run `svelte-check`.
- Use TDD for every behavior change.
- Preserve browser timestamps for direct UI requests.
- Keep the migration reversible with `TimerMigrationFlags.scramble`.
- Do not connect `ScramblePreviewService` or change image behavior in this checkpoint.
- Stop after activation so the user can test the timer route.

---

### Task 1: Project Current Scramble State

**Files:**
- Modify: `src/lib/timer/TimerState.svelte.ts`
- Create: `src/lib/timer/handlers/registerScrambleHandlers.ts`
- Create: `src/lib/timer/handlers/registerScrambleHandlers.test.ts`

**Interfaces:**
- Produces `registerScrambleHandlers(bus, state, ownerId)`.
- Adds `scrambleRequestId`, `scrambleMode`, `scrambleLength`, and `scrambleProbability`.

- [ ] Write tests proving owner filtering, latest-request tracking, stale-result rejection, accepted-result projection, and unsubscription.
- [ ] Run the focused test and confirm it fails because the handler is missing.
- [ ] Implement request/result projections; do not publish preview events.
- [ ] Run focused tests and ESLint.
- [ ] Commit as `feat: project owner-scoped scramble state`.

### Task 2: Compose the Service and Runtime Command

**Files:**
- Modify: `src/lib/timer/TimerApplicationRuntime.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`

**Interfaces:**
- Application options accept `scrambleGenerators?: IScrambleGenerator[]`.
- Application runtime exposes its application-scoped `scrambleService`.
- Timer runtime adds `requestScramble(input, nativeEvent?): Promise<string>`.

- [ ] Write tests proving one shared service, native/programmatic timestamps, owner isolation, destruction, and accepted state projection.
- [ ] Run focused tests and confirm the new APIs are absent.
- [ ] Compose `ScrambleService`, register owner projections, and create the envelope before publication so the request ID can be returned.
- [ ] Run focused tests, TypeScript, and ESLint.
- [ ] Commit as `feat: compose scramble service in timer runtime`.

### Task 3: Activate the Timer Scramble Bridge

**Files:**
- Create: `src/lib/timer/scramble/createScrambleRequestInput.ts`
- Create: `src/lib/timer/scramble/createScrambleRequestInput.test.ts`
- Modify: `src/lib/timer/context/timerContext.ts`
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerTab/TimerOptions.svelte`
- Create: `src/lib/timer/ScrambleUiBridge.test.ts`

**Interfaces:**
- `createScrambleRequestInput` resolves the selected mode, length, scalar/array probability, provided scramble, and request source without generating anything.
- `initScrambler` accepts optional native timestamp and source arguments while preserving old positional callers.

- [ ] Write resolver and source-wiring tests for initial session selection, refresh click, keyboard refresh, edited/old scramble, and session mode/probability changes.
- [ ] Run focused tests and confirm the bridge is absent.
- [ ] Enable the scramble flag, request once when the selected configuration becomes available, publish direct actions with native timestamps, and mirror only accepted event state into `timerController.scramble`.
- [ ] Ensure this path never calls `updateImage` and does not connect preview services.
- [ ] Run focused tests, TypeScript, ESLint, and `git diff --check`.
- [ ] Commit as `feat: activate event-driven timer scrambles`.

### Task 4: Add Lifecycle Scramble Requests

**Files:**
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Create: `src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts`

**Interfaces:**
- `TimerRuntimeOptions.getScrambleRequest(source)` supplies current session configuration.
- Completed runs request `SOLVE_COMPLETED` after the legacy save callback.
- Running cancellation requests `RUNNING_CANCELLED` only when `scrambleAfterCancel` is enabled.

- [ ] Write integration tests for completed stops, automatic inspection DNF, running cancellation enabled/disabled, prevention/inspection cancellation, ordering, and owner isolation.
- [ ] Run focused tests and confirm lifecycle requests are absent.
- [ ] Add owner-filtered lifecycle subscriptions using the explicit `cancelledFrom` payload.
- [ ] Run integration tests, TypeScript, ESLint, and all scramble-focused tests.
- [ ] Commit as `feat: advance scrambles from timer lifecycle events`.

## Manual Acceptance

Test `/timer/<sessionId>` after Task 4:

1. An initial scramble appears without an override prop.
2. Refresh, Ctrl+S, edit, and old-scramble selection update it.
3. Completed solves advance it after saving.
4. Running cancellation follows `scrambleAfterCancel`; inspection cancellation does not advance it.
5. Session mode/probability changes request exactly one scramble.
6. Event diagnostics show owner/request IDs and native timestamps.
7. Preview behavior is intentionally deferred to the next checkpoint.
