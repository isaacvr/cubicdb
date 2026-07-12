# Timer Event-Driven Migration Design

**Status:** Approved design

**Date:** July 12, 2026

**Scope:** Migrate the timer subsystem to an event-driven architecture. The wider application migration follows later and is not part of this implementation sequence.

## Goals

- Make EventBus the communication boundary for normal timer interactions.
- Keep high-frequency elapsed-time readings on an explicit direct channel.
- Centralize timer event names in one importable constant object.
- Provide strongly typed payload completion for every known timer event.
- Preserve native input timing at the point where input enters the application.
- Migrate in vertical slices that remain testable, operational, and independently reversible.
- Include unit and integration tests in every implementation PR.

## Non-Goals

- Migrating algorithms, tutorials, reconstructions, themes, or other application sections.
- Sending high-frequency elapsed-time readings through EventBus.
- Adding event ancestry through `causationId` or `originTimestamp`.
- Removing legacy timer paths before their event-driven replacements are proven.
- Building the application as part of this migration-planning work.

## Current Baseline

The repository contains a partial Phase 0 implementation:

- `Result`, `EventBus`, `EventDispatcher`, timer event classes, `TimerState`, and `TimerReactor` exist.
- `Result` has unit tests, but EventBus, TimerState, and TimerReactor do not.
- Timer events are currently represented by classes whose names also act as routing keys.
- Timer UI and devices still depend on `TimerController`, Svelte writable stores, `InputContext`, and `src/lib/timer/adaptors/`.
- Solve and session handlers exist but are primarily logging placeholders.
- Event-driven keyboard, manual, virtual, Stackmat, GAN, and QiYi devices do not exist under `src/lib/devices/`.
- DeviceManager, event-integrated ScrambleService, discovery adapters, and complete timer integration tests are missing.
- Existing migration documents disagree about phase numbering and whether the timer or whole application is in scope.

At design approval time, `pnpm exec eslint .` completes successfully and `pnpm test:unit --run` reports 46 passing tests across five test files.

## Architectural Boundaries

### Event Registry and Typed Envelope

All timer event names live in a canonical `TIMER_EVENTS` constant. Publishers and subscribers import values from this registry instead of duplicating string literals.

```ts
export const TIMER_EVENTS = {
  DEVICE_PREVENTION_ENTERED: 'timer.device.prevention-entered',
  DEVICE_READY: 'timer.device.ready',
  DEVICE_INSPECTION_STARTED: 'timer.device.inspection-started',
  DEVICE_GREEN_LIGHT_CHANGED: 'timer.device.green-light-changed',
  DEVICE_RUN_STARTED: 'timer.device.run-started',
  DEVICE_RUN_STOPPED: 'timer.device.run-stopped',
  DEVICE_RUN_CANCELLED: 'timer.device.run-cancelled',
  DEVICE_PAUSED: 'timer.device.paused',
  DEVICE_RESUMED: 'timer.device.resumed',
  DEVICE_STEP_COMPLETED: 'timer.device.step-completed',
  DEVICE_PENALTY_APPLIED: 'timer.device.penalty-applied',
  SESSION_SWITCH_REQUESTED: 'timer.session.switch-requested',
  SESSION_SWITCHED: 'timer.session.switched',
  SOLVE_ADD_REQUESTED: 'timer.solve.add-requested',
  SOLVE_ADDED: 'timer.solve.added',
  SOLVE_UPDATE_REQUESTED: 'timer.solve.update-requested',
  SOLVE_UPDATED: 'timer.solve.updated',
  SOLVES_REMOVE_REQUESTED: 'timer.solve.remove-requested',
  SOLVES_REMOVED: 'timer.solve.removed',
  SCRAMBLE_REQUESTED: 'timer.scramble.requested',
  SCRAMBLE_GENERATED: 'timer.scramble.generated',
  STATISTICS_REQUESTED: 'timer.statistics.requested',
  STATISTICS_UPDATED: 'timer.statistics.updated',
  NEW_RECORD: 'timer.statistics.new-record',
  HANDLER_FAILED: 'timer.system.handler-failed',
} as const;
```

The final registry must include every event required by the approved timer flows. The implementation plan may refine names before PR 1, but PR 1 freezes the public registry contract for later slices.

Each event uses one generic envelope:

```ts
export interface TimerEvent<K extends TimerEventType> {
  id: string;
  type: K;
  timestamp: number;
  payload: TimerEventPayloadMap[K];
}
```

`TimerEventPayloadMap` maps every registry value to an explicit payload. This provides autocomplete and makes invalid or missing payload properties a TypeScript error. Events without domain data use an explicit empty payload type rather than making `payload` optional.

### Event Identity

Every event receives a unique `id` when created. The ID supports logging, diagnostics, deduplication, and handler-error reporting. Event ancestry is intentionally excluded for now.

### Timestamp Semantics

`timestamp` is a monotonic relative timestamp used to calculate elapsed time between an origin input and later readings.

- DOM-originated events capture the browser-provided `Event.timeStamp` synchronously at the input boundary.
- Programmatic events capture an injected monotonic clock equivalent to `performance.now()`.
- Derived events receive their own timestamp.
- A native timestamp must be captured before any `await`, timer, queue, or EventBus dispatch.
- Tests inject a deterministic clock.
- Wall-clock persistence is outside this timestamp contract. If a future feature requires calendar time, it must add a separate field instead of changing `timestamp` semantics.

### Communication Rules

Normal communication within the timer subsystem and between timer components uses EventBus:

- UI publishes user-intent events.
- Devices publish lifecycle facts.
- Use cases publish success or failure facts.
- Services consume requests and publish results.
- Timer handlers consume facts and update the reactive read model.

Direct calls across those boundaries are prohibited after the corresponding vertical slice migrates.

The sole approved exception is high-frequency elapsed-time data. The active device sends those readings through a direct callback to the timer read model. This callback:

- carries readings only, not lifecycle or business events;
- uses the same monotonic performance timeline as event timestamps;
- cannot save solves, request scrambles, calculate statistics, switch sessions, or select devices;
- is covered by an integration test that compares readings with the originating event timestamp.

Internal calls within one cohesive component remain normal implementation details. For example, a use case may call its repository port, and a device may transition its internal XState machine.

## Components

### EventBus

EventBus provides typed subscription and publication against `TimerEventPayloadMap`. Events are queued and handlers execute sequentially in registration/priority order. Publishing from a handler queues a later event instead of recursively processing it.

If one handler fails, EventBus records a `HANDLER_FAILED` event containing the failed event type, failed event ID, failed event timestamp, handler identifier, and normalized error. Remaining handlers for the original event still execute. Error handling must prevent an error-handler failure from creating an infinite loop.

### TimerState

`TimerState` is the Svelte 5 reactive read model for timer UI. It contains timer lifecycle state, displayed time, ready state, active scramble, session, solves, last solve, statistics, active device metadata, steps, and penalty state.

Only the reactor and registered timer handlers mutate TimerState. UI components render it and publish intent events; devices and repositories never mutate it directly.

### Timer Reactor and Handlers

The reactor owns timer lifecycle projections such as prevention, inspection, running, paused, stopped, and clean. Focused handlers own solve, session, scramble, statistics, device, and error projections. Registration returns a disposable collection so tests and component teardown cannot leak subscriptions.

### Devices

Each device owns its internal state machine and hardware/input details. It receives:

- the typed EventBus publisher;
- the high-frequency reading callback;
- a read-only view of settings needed to control its lifecycle;
- platform capabilities required by that device.

Devices never receive TimerController, mutable TimerState, repository instances, or Svelte stores.

### Use Cases and Repositories

Use cases validate input and coordinate repository ports. UI and devices do not call repositories. Event handlers invoke use cases in response to request/fact events, and successful operations publish result events.

Expected domain failures use `Result<T, E>`. Programming errors may throw and are isolated by EventBus as handler failures.

### Services

- DeviceManager coordinates discovery, connection, active-device selection, compatibility, and keyboard fallback.
- ScrambleService consumes scramble requests and publishes generated or failed results.
- Statistics calculation consumes explicit requests and publishes updated statistics and separate new-record events.
- Celebration logic consumes new-record events.
- Preview generation consumes scramble-generated events and does not block scramble display.

### Composition Root and Migration Flags

A timer composition root creates and wires EventBus, TimerState, reactor, handlers, use cases, repositories, services, and devices. Svelte components consume the composed timer API rather than creating infrastructure ad hoc.

Temporary migration flags select legacy or event-driven implementations at vertical-slice boundaries. Flags are removed together with legacy code in the final cleanup PR.

## Vertical Migration Strategy

Each vertical slice delivers a complete path from input through EventBus to state and side effects. A slice includes its contracts, implementation, integration wiring, and tests. The legacy implementation stays available until the replacement slice passes its acceptance tests.

Recommended slice order:

1. Typed event foundation and tested existing reactor baseline.
2. Composition root and reversible migration boundary.
3. Keyboard lifecycle end to end.
4. Solve persistence, penalties, and statistics after keyboard stop.
5. Scramble generation and preview side effects.
6. Manual and virtual devices.
7. Session switching, settings, and device compatibility.
8. Stackmat and QiYi timer devices.
9. GAN/Bluetooth device and discovery implementations.
10. Timer UI conversion and removal of remaining direct regular communication.
11. Legacy cleanup and migration-flag removal.

Every slice is independently reviewable and revertible. A PR must not remove a legacy path required by an unmigrated device or flow.

## Testing Strategy

Every PR contains tests for every introduced or changed part.

### Contract Tests

- Every registry key maps to a unique event value.
- Every event value has a payload-map entry.
- Factory calls infer and require the correct payload.
- Native event factories preserve `Event.timeStamp`.
- Programmatic factories use the injected monotonic clock.
- Event IDs are unique under the selected ID provider.

Compile-time expectations use TypeScript type-test assertions or `@ts-expect-error` cases checked by the existing type-check command. Runtime contract behavior uses Vitest.

### Unit Tests

- EventBus queue order, priority, one-shot subscriptions, unsubscribe behavior, nested publication, and handler isolation.
- TimerState reset and projection behavior.
- Reactor transitions for every device lifecycle event.
- Each device state transition and emitted event payload/timestamp.
- Each use case success, validation failure, and repository failure.
- Each service request/result/fallback behavior.

### Integration Tests

Integration tests use a real EventBus and in-memory repository adapters. EventBus is never mocked.

Each vertical slice tests its full flow. Examples include:

- Native key input timestamp to start/stop event and persisted solve duration.
- Cancellation returning to clean without persistence.
- Inspection penalty and DNF behavior.
- Multi-step timing.
- Stop event to solve persistence, statistics request, and scramble request.
- Manual submission and virtual first/last move flows.
- Session switch to device compatibility check and keyboard fallback.
- Hardware/discovery events using boundary fakes for browser APIs, audio, IPC, or Bluetooth.

### Regression and Reversibility Tests

- While a migration flag exists, both legacy and event-driven paths receive smoke coverage.
- A migrated slice does not change unmigrated device behavior.
- Duplicate event registration and leaked subscriptions are detected.
- Final cleanup tests prove no timer production import references TimerController, InputContext, legacy timer adaptors, writable timer stores, or duplicate emitters.

## PR Quality Gates

Each PR must pass, without running a build:

```text
pnpm exec eslint .
pnpm check
pnpm test:unit --run
```

Targeted Vitest commands run during TDD before the full unit suite. Hardware/device slices may add focused Playwright or integration commands when they do not invoke a build.

Each PR description includes:

- the vertical capability delivered;
- the legacy fallback retained;
- new and changed event contracts;
- tests added and commands run;
- rollback instructions;
- follow-up work intentionally excluded.

## Documentation Consolidation

The implementation sequence will make this specification and its PR plan authoritative for timer migration. Existing documents remain useful domain references but must be updated to remove contradictions:

- `docs/architecture/timer/migration.md` links to the new PR plan and reflects vertical slices.
- `ARCHITECTURE_STATUS.md` reports measured implementation progress instead of the stale zero-percent value.
- `DEFINITION_PHASE_SUMMARY.md` separates the timer migration from the later whole-application migration.
- `EVENT_DRIVEN_TEMPLATES.txt` adopts the registry/envelope contract and removes examples that contradict the approved communication and timestamp rules.
- `IMPLEMENTATION_READING_GUIDE.md` points implementers to the authoritative specification and plan.

## Completion Criteria

The timer migration is complete when:

- all normal timer communication crosses EventBus through typed registry events;
- only high-frequency elapsed-time readings use the documented direct callback;
- every native input event preserves its browser timestamp;
- every event has an ID, timestamp, type, and typed payload;
- every device works through the event-driven interface;
- solve, session, scramble, statistics, penalty, device, and error flows are event-driven;
- TimerState is the timer UI read model;
- TimerController, InputContext, legacy timer adaptors, old timer stores, migration flags, and timer-specific duplicate emitters are removed;
- lint, type checking, and unit/integration tests pass without requiring a build;
- each migration PR contains tests and remains independently revertible.

