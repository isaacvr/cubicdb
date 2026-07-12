# Timer Event-Driven Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the timer subsystem's regular direct communication with typed EventBus flows while retaining a direct channel only for high-frequency elapsed-time readings.

**Architecture:** Migrate complete vertical slices behind temporary per-slice flags. A canonical `TIMER_EVENTS` object and `TimerEventPayloadMap` define the contract; a queued EventBus delivers typed envelopes; TimerState is the UI read model; devices own lifecycle state; handlers invoke use cases and services. Each PR keeps legacy fallback paths until the final cleanup PR.

**Tech Stack:** TypeScript 5.9, Svelte 5 runes, SvelteKit 2, XState 5, Vitest 4, Playwright, ESLint 9.

## Global Constraints

- Do not run `pnpm build`, `vite build`, Electron Builder, or any equivalent build command.
- Every event has exactly `id`, `type`, `timestamp`, and `payload` envelope fields.
- Native input events use the input's browser-provided `Event.timeStamp`.
- Programmatic events use an injected monotonic clock equivalent to `performance.now()`.
- Do not add `originTimestamp` or `causationId`.
- All regular timer communication uses EventBus after its vertical slice migrates.
- Only high-frequency elapsed-time readings may use the direct callback.
- Integration tests use a real EventBus; never mock EventBus.
- Every PR includes tests for every added or changed component.
- Every PR must remain independently revertible and leave a working legacy fallback where migration is incomplete.
- Preserve unrelated working-tree changes.

## Baseline Status

| Existing migration item | Measured status | Evidence |
|---|---|---|
| `Result<T, E>` | Implemented and tested | `src/lib/core/domain/Result.ts`, 30 tests |
| EventBus/EventDispatcher | Implemented, not adequately tested, contract incompatible with approved envelope | Class-constructor routing in `src/lib/events/EventBus.ts`; no EventBus test |
| Timer event definitions | Partial, incompatible with canonical registry/envelope | `src/lib/events/domain/TimerEvents.ts` |
| TimerState | Partial, unused by production timer, untested | `src/lib/timer/TimerState.svelte.ts` |
| TimerReactor | Phase-0 projection only, untested | `src/lib/timer/TimerReactor.ts` |
| Solve/session use cases | Partial and inconsistent with Result conventions | `src/lib/core/usecases/` |
| Solve/session handlers | Logging scaffolds only | `src/lib/events/handlers/` |
| Event-driven devices | Not implemented | No `src/lib/devices/` directory |
| UI migration | Not started | `Timer.svelte` constructs TimerController |
| Legacy removal | Not started | TimerController, InputContext, stores, adaptors remain |
| ESLint | Clean on approved baseline | `pnpm exec eslint .` exited 0 |
| Unit tests | 46 passing across 5 files | `pnpm test:unit --run` |

## Planned File Structure

```text
src/lib/events/timer/
├── TimerEventRegistry.ts       # TIMER_EVENTS and TimerEventType
├── TimerEventPayloadMap.ts     # event-to-payload contract
├── TimerEvent.ts               # generic envelope
├── TimerEventFactory.ts        # native/programmatic event creation
└── TimerEventBus.ts             # queued typed bus
src/lib/timer/
├── TimerCompositionRoot.svelte.ts
├── TimerMigrationFlags.ts
├── TimerReadonlyView.ts
├── TimerState.svelte.ts
├── TimerReactor.ts
├── devices/
├── handlers/
├── repositories/
├── services/
└── usecases/
```

Existing generic events outside the timer remain unchanged until the later application-wide migration.

---

### PR 1: Freeze the Typed Timer Event Contract

**Branch:** `refactor/timer-event-contract`

**Purpose:** Replace timer class-constructor routing with the approved typed envelope and a queued, failure-isolating bus. This PR does not connect production UI.

**Files:**
- Create: `src/lib/events/timer/TimerEventRegistry.ts`
- Create: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Create: `src/lib/events/timer/TimerEvent.ts`
- Create: `src/lib/events/timer/TimerEventFactory.ts`
- Create: `src/lib/events/timer/TimerEventFactory.test.ts`
- Create: `src/lib/events/timer/TimerEventTypes.test-d.ts`
- Create: `src/lib/events/timer/TimerEventBus.ts`
- Create: `src/lib/events/timer/TimerEventBus.test.ts`
- Modify: `src/lib/events/index.ts`

**Interfaces:**

```ts
export interface IMonotonicClock { now(): number }
export interface IEventIdProvider { next(): string }
export interface TimerEvent<K extends TimerEventType> {
  id: string;
  type: K;
  timestamp: number;
  payload: TimerEventPayloadMap[K];
}
export interface ITimerEventBus {
  publish<K extends TimerEventType>(event: TimerEvent<K>): Promise<void>;
  subscribe<K extends TimerEventType>(type: K, handlerId: string,
    handler: (event: TimerEvent<K>) => void | Promise<void>,
    options?: { priority?: number; once?: boolean }): EventSubscription;
}
```

- [ ] **Step 1: Write contract and factory tests first**

Cover unique registry values, required payloads, rejected invalid payloads with `@ts-expect-error`, unique IDs, native `timeStamp` preservation, and injected programmatic clock use.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `pnpm exec vitest run src/lib/events/timer/TimerEventFactory.test.ts`

Expected: FAIL because the factory and registry do not exist.

- [ ] **Step 3: Implement registry, payload map, envelope, and factories**

The native factory accepts `{ timeStamp: number }`; it reads `timeStamp` synchronously and never substitutes the injected clock. The programmatic factory uses `clock.now()`. Both require a payload inferred from `K`.

- [ ] **Step 4: Write EventBus behavior tests first**

Cover sequential order, priorities, nested publication queued after the current event, `once`, unsubscribe, remaining-handler execution after failure, and exactly one `HANDLER_FAILED` event with failed event metadata.

- [ ] **Step 5: Implement the queued TimerEventBus**

Use one FIFO queue and one drain promise. Never recursively dispatch. Prevent a failing `HANDLER_FAILED` handler from publishing another handler-failure event.

- [ ] **Step 6: Verify PR 1**

Run: `pnpm exec vitest run src/lib/events/timer`

Run: `pnpm check`

Run: `pnpm exec eslint .`

Run: `pnpm test:unit --run`

Expected: all commands exit 0; no build runs.

**Rollback:** Revert PR 1. No production timer path imports the new contract yet.

---

### PR 2: Establish the Timer Read Model and Composition Boundary

**Branch:** `refactor/timer-composition-root`

**Depends on:** PR 1

**Files:**
- Modify: `src/lib/timer/TimerState.svelte.ts`
- Create: `src/lib/timer/TimerState.test.ts`
- Modify: `src/lib/timer/TimerReactor.ts`
- Create: `src/lib/timer/TimerReactor.test.ts`
- Create: `src/lib/timer/TimerReadonlyView.ts`
- Create: `src/lib/timer/TimerMigrationFlags.ts`
- Create: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Create: `src/lib/timer/TimerCompositionRoot.test.ts`

**Interfaces:**

```ts
export interface TimerReadonlyView {
  readonly state: TimerStateValue;
  readonly session: Session | null;
  readonly scramble: string;
}
export interface TimerMigrationFlags {
  keyboard: boolean; manual: boolean; virtual: boolean;
  stackmat: boolean; qiyi: boolean; gan: boolean;
}
export interface TimerRuntime {
  state: TimerState;
  bus: ITimerEventBus;
  destroy(): void;
}
```

- [ ] **Step 1: Write failing state/reactor projection tests**

Cover clean reset, prevention, ready/green light, inspection, running, pause/resume, stop, cancel, DNF, penalty, and multi-step projection. Assert destroyed reactors no longer react.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `pnpm exec vitest run src/lib/timer/TimerState.test.ts src/lib/timer/TimerReactor.test.ts`

- [ ] **Step 3: Adapt TimerState and TimerReactor to typed registry events**

Keep side effects out of the reactor. Return a disposable subscription collection.

- [ ] **Step 4: Write and implement composition-root tests**

Assert one bus, one state, one reactor registration, idempotent destroy, and default-all-false migration flags.

- [ ] **Step 5: Verify PR 2 using the four global quality commands**

**Rollback:** Revert PR 2 then PR 1; production TimerController remains unchanged.

---

### PR 3: Migrate the Keyboard Lifecycle End to End

**Branch:** `refactor/timer-keyboard-events`

**Depends on:** PR 2

**Files:**
- Create: `src/lib/timer/devices/ITimerDevice.ts`
- Create: `src/lib/timer/devices/KeyboardDevice.ts`
- Create: `src/lib/timer/devices/KeyboardDevice.test.ts`
- Create: `src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts`
- Create: `src/lib/timer/handlers/KeyboardInputBoundary.ts`
- Create: `src/lib/timer/handlers/KeyboardInputBoundary.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerMigrationFlags.ts`

**Interfaces:**

```ts
export interface TimerReading { timestamp: number; elapsedMs: number }
export interface ITimerDevice {
  readonly id: string;
  start(): void;
  stop(): void;
  destroy(): void;
}
export type TimerReadingCallback = (reading: TimerReading) => void;
```

- [ ] **Step 1: Write failing keyboard boundary tests**

Assert `keydown`/`keyup` browser timestamps are preserved before dispatch, repeat keys are ignored, unrelated keys do nothing, and Escape publishes cancellation.

- [ ] **Step 2: Write failing device lifecycle tests**

Cover CLEAN → PREVENTION → READY → INSPECTION/RUNNING → STOPPED, green light, cancellation, inspection +2/DNF, pause/resume, and multi-step events.

- [ ] **Step 3: Implement the XState KeyboardDevice and input boundary**

The device receives only bus, readonly view, clock/timer scheduler, and reading callback. It never receives TimerController or mutable stores.

- [ ] **Step 4: Write the real-bus integration test**

Prove native input → device events → reactor → TimerState, plus reading callback timestamps relative to the native input. Prove the disabled flag keeps the legacy keyboard path.

- [ ] **Step 5: Wire only the keyboard slice behind `flags.keyboard`**

Do not alter manual, virtual, Stackmat, QiYi, or GAN selection.

- [ ] **Step 6: Verify PR 3 with focused tests and all global quality commands**

**Rollback:** Set `keyboard` false immediately; reverting PR 3 restores the unchanged legacy keyboard adaptor.

---

### PR 4: Persist Solves and Calculate Statistics from Stop Events

**Branch:** `refactor/timer-solve-events`

**Depends on:** PR 3

**Files:**
- Create: `src/lib/timer/repositories/InMemorySolveRepository.ts`
- Modify: `src/lib/core/ports/ISolveRepository.ts`
- Create: `src/lib/timer/usecases/CreateSolveUseCase.ts`
- Create: `src/lib/timer/usecases/AddSolveUseCase.ts`
- Create: `src/lib/timer/usecases/UpdateSolveUseCase.ts`
- Create: `src/lib/timer/usecases/RemoveSolvesUseCase.ts`
- Create: `src/lib/timer/usecases/CalculateStatisticsUseCase.ts`
- Create: matching `*.test.ts` beside each use case
- Create: `src/lib/timer/handlers/registerSolveHandlers.ts`
- Create: `src/lib/timer/handlers/registerSolveHandlers.test.ts`
- Create: `src/lib/timer/SolveCompletionFlow.integration.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`

**Produces:** Stop → create → persist → `SOLVE_ADDED` → statistics request/update/new-record flow, with penalty and removal/update flows returning `Result`.

- [ ] **Step 1: Write failing use-case tests for success and every documented validation/repository error**
- [ ] **Step 2: Implement minimal Result-returning use cases**
- [ ] **Step 3: Write failing handler tests for stop, add, update, remove, penalty, DNF, and handler failure**
- [ ] **Step 4: Implement focused solve handlers and disposable registration**
- [ ] **Step 5: Write integration tests proving exact duration comes from monotonic native start/stop timestamps, cancellation does not persist, and each successful mutation requests statistics once**
- [ ] **Step 6: Verify PR 4 with focused tests and all global quality commands**

**Rollback:** Revert PR 4; keyboard lifecycle remains event-driven but uses the legacy completion side effects selected by composition configuration.

---

### PR 5: Move Scramble and Preview Side Effects Behind Events

**Branch:** `refactor/timer-scramble-events`

**Depends on:** PR 4

**Files:**
- Create: `src/lib/timer/services/IScrambleGenerator.ts`
- Create: `src/lib/timer/services/ScrambleService.ts`
- Create: `src/lib/timer/services/ScrambleService.test.ts`
- Create: `src/lib/timer/services/ScramblePreviewService.ts`
- Create: `src/lib/timer/services/ScramblePreviewService.test.ts`
- Create: `src/lib/timer/handlers/registerScrambleHandlers.ts`
- Create: `src/lib/timer/ScrambleFlow.integration.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`

- [ ] **Step 1: Test generator priority, mode/prob deduplication, empty fallback, failure event, and request timestamp/ID rules**
- [ ] **Step 2: Implement ScrambleService and handlers**
- [ ] **Step 3: Test preview generation as a non-blocking subscriber to `SCRAMBLE_GENERATED`**
- [ ] **Step 4: Integrate stop → solve added → scramble requested → generated → state/preview, using a real bus**
- [ ] **Step 5: Verify PR 5 with focused tests and all global quality commands**

**Rollback:** Disable event-driven scramble service and retain the existing generator bridge.

---

### PR 6: Migrate Manual and Virtual Devices

**Branch:** `refactor/timer-simple-device-events`

**Depends on:** PR 5

**Files:**
- Create: `src/lib/timer/devices/ManualDevice.ts`
- Create: `src/lib/timer/devices/ManualDevice.test.ts`
- Create: `src/lib/timer/devices/VirtualDevice.ts`
- Create: `src/lib/timer/devices/VirtualDevice.test.ts`
- Create: `src/lib/timer/devices/SimpleDeviceFlows.integration.test.ts`
- Modify: `src/lib/timer/TimerMigrationFlags.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerTab/timer-handlers/ManualInputHandler.svelte`
- Modify: `src/lib/timer/TimerTab/timer-handlers/VirtualInputHandler.svelte`

- [ ] **Step 1: Test manual validation and submit timestamp propagation**
- [ ] **Step 2: Test virtual first-move start, move readings, final-move stop, cancellation, and reconstruction payload**
- [ ] **Step 3: Implement both devices with no TimerController/InputContext dependencies**
- [ ] **Step 4: Test each full flow through persistence, statistics, and scramble using the real bus; test both flags disabled**
- [ ] **Step 5: Verify PR 6 with focused tests and all global quality commands**

**Rollback:** Disable `manual` and `virtual` flags independently.

---

### PR 7: Migrate Sessions, Settings, and Device Compatibility

**Branch:** `refactor/timer-session-events`

**Depends on:** PR 6

**Files:**
- Create: `src/lib/timer/usecases/SwitchSessionUseCase.ts`
- Create: `src/lib/timer/usecases/SetSessionSettingsUseCase.ts`
- Create: corresponding unit tests
- Create: `src/lib/timer/services/DeviceManager.ts`
- Create: `src/lib/timer/services/DeviceManager.test.ts`
- Create: `src/lib/timer/handlers/registerSessionHandlers.ts`
- Create: `src/lib/timer/SessionSwitchFlow.integration.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerTab/TimerOptions.svelte`

- [ ] **Step 1: Test session-switch and settings Result contracts, including immediate section-specific persistence**
- [ ] **Step 2: Test DeviceManager compatibility filtering, binding, disconnect, and keyboard fallback**
- [ ] **Step 3: Implement request/result handlers and state projections**
- [ ] **Step 4: Integrate UI intent → session switch → solves/settings load → compatibility → active-device event**
- [ ] **Step 5: Verify PR 7 with focused tests and all global quality commands**

**Rollback:** Revert UI event publishing and composition registration; legacy session utilities remain until PR 11.

---

### PR 8: Migrate Stackmat and QiYi Timer Devices

**Branch:** `refactor/timer-hardware-events`

**Depends on:** PR 7

**Files:**
- Create: `src/lib/timer/devices/StackmatDevice.ts`
- Create: `src/lib/timer/devices/StackmatDevice.test.ts`
- Create: `src/lib/timer/devices/QiYiTimerDevice.ts`
- Create: `src/lib/timer/devices/QiYiTimerDevice.test.ts`
- Create: `src/lib/timer/devices/HardwareTimerFlows.integration.test.ts`
- Modify: `src/lib/timer/TimerMigrationFlags.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`

- [ ] **Step 1: Extract audio/serial boundary fixtures from legacy adaptors without changing their algorithms**
- [ ] **Step 2: Test connect/disconnect, clean/run/stop, malformed readings, timestamp capture, and high-frequency callback behavior**
- [ ] **Step 3: Implement devices around the tested boundaries**
- [ ] **Step 4: Integrate each independently flagged flow through solve completion; verify the other hardware flag and all legacy devices remain unaffected**
- [ ] **Step 5: Verify PR 8 with focused tests and all global quality commands**

**Rollback:** Disable `stackmat` or `qiyi` independently.

---

### PR 9: Migrate GAN/Bluetooth and Device Discovery

**Branch:** `refactor/timer-bluetooth-events`

**Depends on:** PR 8

**Files:**
- Create: `src/lib/timer/devices/GanDevice.ts`
- Create: `src/lib/timer/devices/GanDevice.test.ts`
- Create: `src/lib/timer/devices/IDeviceDiscovery.ts`
- Create: `src/lib/timer/devices/WebDeviceDiscovery.ts`
- Create: `src/lib/timer/devices/ElectronDeviceDiscovery.ts`
- Create: tests for each discovery implementation
- Create: `src/lib/timer/devices/BluetoothFlow.integration.test.ts`
- Modify: `src/lib/timer/services/DeviceManager.ts`
- Modify: `src/lib/timer/TimerMigrationFlags.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`

- [ ] **Step 1: Test discovery permission, found/lost devices, connect/disconnect, unsupported platform, and normalized errors using Web Bluetooth/IPC boundary fakes**
- [ ] **Step 2: Test GAN first move, high-frequency readings, final solved state, reconstruction, disconnect, and timestamp rules**
- [ ] **Step 3: Implement platform discovery and GAN device without direct UI/timer calls**
- [ ] **Step 4: Integrate discovery → selection → connection → solve → disconnect/fallback with a real bus**
- [ ] **Step 5: Verify PR 9 with focused tests and all global quality commands**

**Rollback:** Disable `gan`; DeviceManager selects the legacy GAN implementation or keyboard fallback.

---

### PR 10: Complete Timer UI Event Integration

**Branch:** `refactor/timer-ui-events`

**Depends on:** PR 9

**Files:**
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerTab/TimerTab.svelte`
- Modify: `src/lib/timer/TimerTab/TimerOptions.svelte`
- Modify: `src/lib/timer/HistoryTab/HistoryTab.svelte`
- Modify: `src/lib/timer/StatsTab/StatsTab.svelte`
- Modify: all files under `src/lib/timer/TimerTab/timer-handlers/`
- Create: `src/lib/timer/TimerUiFlow.integration.test.ts`
- Create: `src/lib/timer/TimerCommunicationBoundary.test.ts`

- [ ] **Step 1: Add failing UI tests for intent publication and TimerState rendering across every timer tab/action**
- [ ] **Step 2: Replace regular TimerController/InputContext calls with typed event publication and reactive TimerState reads**
- [ ] **Step 3: Add a boundary test scanning timer production imports for forbidden direct dependencies, with an explicit allowlist only for still-required PR 11 legacy files**
- [ ] **Step 4: Run keyboard, manual, virtual, Stackmat, QiYi, and GAN UI smoke flows without a build**
- [ ] **Step 5: Verify PR 10 with focused tests and all global quality commands**

**Rollback:** Revert PR 10; all event-driven backend slices remain present but UI returns to the legacy composition path.

---

### PR 11: Remove Legacy Timer Architecture and Consolidate Documentation

**Branch:** `refactor/remove-legacy-timer`

**Depends on:** PR 10 and an explicit production acceptance decision

**Files:**
- Delete: `src/lib/controllers/TimerController.ts`
- Delete: `src/lib/timer/adaptors/Keyboard.ts`
- Delete: `src/lib/timer/adaptors/Manual.ts`
- Delete: `src/lib/timer/adaptors/Virtual.ts`
- Delete: `src/lib/timer/adaptors/Stackmat.ts`
- Delete: `src/lib/timer/adaptors/QY-Timer.ts`
- Delete: `src/lib/timer/adaptors/GAN.ts`
- Delete: obsolete timer handler bridge components after import audit
- Modify: `src/lib/interfaces/index.ts` to remove timer `InputContext` and legacy controller types
- Modify: `src/lib/interfaces/devices.types.ts` to remove legacy device interfaces
- Delete: `src/lib/timer/TimerMigrationFlags.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts` to make event-driven implementations unconditional
- Modify: `docs/architecture/timer/migration.md`
- Modify: `ARCHITECTURE_STATUS.md`
- Modify: `DEFINITION_PHASE_SUMMARY.md`
- Modify: `EVENT_DRIVEN_TEMPLATES.txt`
- Modify: `IMPLEMENTATION_READING_GUIDE.md`
- Modify: `src/lib/timer/TimerCommunicationBoundary.test.ts`

- [ ] **Step 1: Require user approval for the irreversible cleanup PR**

Present acceptance evidence for every device and timer flow before deleting fallback code.

- [ ] **Step 2: Tighten the boundary test to reject TimerController, InputContext, writable timer stores, timer adaptors, migration flags, and timer-specific duplicate emitters with no allowlist**

- [ ] **Step 3: Run the boundary test and confirm RED while legacy code remains**

- [ ] **Step 4: Remove legacy code and make event-driven composition unconditional**

- [ ] **Step 5: Update all migration/status/templates/reading documents to match measured final architecture**

- [ ] **Step 6: Verify every device flow, all unit tests, type checking, and ESLint without running a build**

Run: `pnpm exec vitest run src/lib/timer`

Run: `pnpm test:unit --run`

Run: `pnpm check`

Run: `pnpm exec eslint .`

Expected: all commands exit 0; boundary test finds zero forbidden dependencies.

**Rollback:** Revert PR 11 as one commit/PR to restore flags and legacy paths. Do not partially revert deleted adaptors.

---

## PR Dependency and Reversibility Map

| PR | Depends on | Runtime fallback after merge | Independent rollback |
|---|---|---|---|
| 1 Contract | None | Existing event system untouched | Yes |
| 2 State/composition | 1 | TimerController | Yes, then optionally PR 1 |
| 3 Keyboard | 2 | `keyboard=false` | Yes |
| 4 Solve/stats | 3 | Legacy completion bridge | Yes |
| 5 Scramble | 4 | Legacy scramble bridge | Yes |
| 6 Manual/virtual | 5 | Per-device flags | Yes |
| 7 Sessions/devices | 6 | Legacy session utilities | Yes |
| 8 Stackmat/QiYi | 7 | Per-device flags | Yes |
| 9 GAN/discovery | 8 | GAN flag/keyboard fallback | Yes |
| 10 UI | 9 | Revert UI composition | Yes |
| 11 Cleanup | 10 + acceptance | None | Revert whole PR |

## Execution Discipline

For each PR:

1. Create only that PR's branch.
2. Follow red-green-refactor for each behavior.
3. Commit cohesive test/implementation cycles.
4. Run focused tests after each cycle.
5. Run all four non-build quality gates before requesting review.
6. Record exact commands and results in the PR description.
7. Do not begin the dependent PR until the current PR is approved and merged.
8. Stop and ask the user if implementation reveals an event, payload, timing rule, or device behavior not defined by the specification or referenced architecture documents.

## Plan Self-Review Results

- **Specification coverage:** Registry, typed payloads, IDs, native timestamps, programmatic clock, queued EventBus, failure isolation, direct-reading exception, all timer devices, solve/session/scramble/statistics flows, UI, tests, and legacy cleanup each map to a PR.
- **Test coverage:** Every PR contains contract, unit, integration, regression, or boundary tests for every changed part.
- **Reversibility:** PRs 1–10 preserve an explicit fallback; PR 11 requires acceptance and is reverted atomically.
- **Scope:** The plan covers only the timer architecture. Whole-application event migration remains a later plan.
- **Build constraint:** No step invokes a build command.

