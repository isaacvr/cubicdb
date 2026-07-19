# Bus-Attached Timer Module Migration Design

**Date:** 2026-07-19

**Status:** Approved design direction

**Scope:** Migrate the timer view and its related UI pieces away from parent-passed contexts, direct service/controller calls, and component-to-component callback wiring. The target architecture is a bus-centered module system where logical modules attach to the application EventBus and react to typed events.

**Related documents:**

- `docs/architecture/timer/migration.md`
- `docs/architecture/data-layer.md`
- `docs/architecture/core/services.md`
- `docs/superpowers/specs/2026-07-12-timer-event-driven-migration-design.md`
- `docs/superpowers/specs/2026-07-14-event-driven-device-management-design.md`
- `docs/superpowers/specs/2026-07-16-event-driven-scramble-preview-design.md`
- `docs/superpowers/specs/2026-07-17-scoped-generation-client-design.md`
- `docs/superpowers/specs/2026-07-17-session-scoped-solve-loading-design.md`

## Purpose

The current event-driven migration has useful infrastructure, but `Timer.svelte`, `TimerTab.svelte`, `TimerOptions.svelte`, `HistoryTab.svelte`, and related handlers still depend on broad context objects, parent callback tunnels, shared controllers, direct service calls, and inline configuration objects.

That coupling makes the timer hard to reason about and blocks the intended architecture. A component should not need to know which parent owns a function, which service performs persistence, or which sibling component needs a state update. It should emit a typed request or fact to the bus. If a logical module is attached and interested, it reacts. If nothing is attached, the event is ignored.

This design defines the next migration target: replace broad `inputContext`/`TimerContext` usage and direct service calls with small bus-attached modules, typed event emitters, and scoped projections.

## Goals

- Make the EventBus the default communication channel between timer-related parts.
- Replace `inputContext` prop drilling with events.
- Shrink `TimerContext` until it can be removed or limited to application runtime access.
- Stop timer UI components from calling data, solve, session, scramble, and device services directly.
- Keep modules logical, independent, attachable, detachable, and testable.
- Preserve typed event names and payload completion for known events.
- Avoid a massive application facade or god object.
- Allow components to publish the events they care about without knowing every event in the system.
- Move reusable UI constants out of component bodies.
- Keep the migration reversible through small vertical commit groups.

## Non-Goals

- Creating one giant object with all application functions.
- Replacing the current custom EventBus.
- Adding `BroadcastChannel` or cross-tab transport in this slice.
- Migrating every legacy timer device in one commit.
- Rewriting the data layer internals unless needed behind an event module.
- Removing every legacy controller immediately.
- Making components globally aware of all modules.

## Architectural Principle

Logical modules attach to the bus.

```ts
const detachScrambles = attachScrambleModule({ bus, events, generators });
const detachSolves = attachSolvePersistenceModule({ bus, events, persistence });
const detachTimerProjection = attachTimerProjection({ bus, ownerId, state });
```

Each module owns one responsibility:

- subscribe to specific event types;
- filter by scope or owner when needed;
- perform its work;
- publish result/failure/state events;
- detach all handlers during teardown.

There is no central object that exposes every possible action. A part of the app should know only:

- the bus;
- the event factory or small emitter helper for the event family it needs;
- its own `scopeId`/`ownerId` when events must be scoped.

## Event Publication Boundary

Components may publish events, but they should not hand-build envelopes repeatedly. For ergonomics and typing, each event family may expose small emitter helpers.

Example shape:

```ts
const requestScramble = createScrambleRequestedEmitter({ bus, events });

requestScramble({
  scopeId: timerId,
  config,
  sourceEvent: nativeEvent,
});
```

The helper is not a domain service. It only:

- accepts typed input;
- preserves native timestamps when provided;
- creates the event envelope through the event factory;
- publishes the event.

Helpers should be grouped by event family, not by the whole app:

- `scrambleEventEmitters.ts`
- `imageEventEmitters.ts`
- `solveEventEmitters.ts`
- `sessionEventEmitters.ts`
- `deviceEventEmitters.ts`
- `timerInputEventEmitters.ts`

Low-level infrastructure and tests may still publish directly to the bus.

## Module Categories

### Service Modules

Service modules perform asynchronous or external work and publish results.

Initial service modules:

- `attachScrambleModule`
- `attachImageGenerationModule`
- `attachSolvePersistenceModule`
- `attachSessionPersistenceModule`
- `attachStatisticsModule`
- `attachDeviceManagementModule`

Service modules do not mutate Svelte components directly. They only consume and publish events.

### Projection Modules

Projection modules maintain local reactive state from event streams.

Initial projection modules:

- `attachTimerStateProjection`
- `attachTimerSolveProjection`
- `attachTimerScrambleProjection`
- `attachTimerSessionProjection`
- `attachTimerDeviceProjection`
- `attachTimerStatisticsProjection`

A projection may expose a readonly state object to the component that owns the projection. It should not expose broad command methods.

### Boundary Modules

Boundary modules convert native/browser/device input into application events.

Initial boundary modules:

- keyboard native input boundary;
- pointer/touch timer input boundary;
- manual input boundary;
- legacy device adapter boundaries while old devices are being migrated.

Boundary modules preserve native timestamps when the source is a browser input event.

## Timer Composition

`Timer.svelte` should become a thin shell:

- derive the timer `ownerId`/`scopeId`;
- obtain the application bus from context;
- attach the modules required for that timer instance;
- pass only readonly projection state and the bus/event emitter references needed by child components;
- render the layout.

It should not:

- create solve/session/scramble manager objects inline;
- build broad `inputContext`;
- call persistence services directly;
- call sibling component methods through `bind:this`;
- contain large event subscriptions that belong to projection modules;
- own reusable UI constants such as tab item lists.

## Component Rules

### TimerTab

`TimerTab.svelte` should display timer state and emit user intents.

It may:

- read timer display projection state;
- render the appropriate input UI for the active device;
- emit input, preview, and scramble-related events.

It should not:

- import `dataService`;
- mutate device/controller stores directly;
- handle global keyboard/device logic for managed devices;
- receive `inputContext`;
- call `reset`, `addSolve`, or `initScrambler` through parent callbacks.

### TimerOptions

`TimerOptions.svelte` should render controls and emit requests.

It may:

- read session/device/scramble option projections;
- publish settings change requests;
- publish scramble requests;
- publish seed/filter/tool UI requests where appropriate.

It should not:

- call `sessionController.applySettings`;
- call `dataService.config.saveConfig`;
- call `initInputHandler`;
- mutate `$device`, `$devices`, or `$session` directly;
- define long-lived tool/option registries inline.

### HistoryTab

`HistoryTab.svelte` should display solve projections and emit solve requests.

It may:

- request solve lists;
- publish solve update/remove requests;
- display solve details from projection state;
- keep local modal open/closed state.

It should not:

- call persistence services directly;
- generate solve preview images directly through helper services;
- depend on parent callback methods for update/remove;
- mutate solve arrays as the source of truth.

Preview image generation for solve details should be requested through image events. A local projection may subscribe to the matching result by `scopeId` and `requestId`.

### StatsTab

`StatsTab.svelte` should consume statistics projections or publish statistics requests.

It should not calculate or refresh global/session statistics because another component called it through context.

## Context Usage

Svelte context may still provide stable infrastructure:

- application EventBus;
- event factory;
- logger/debug state;
- theme information;
- application-level readonly runtime object if needed.

Svelte context should not be used as a broad callback bag.

The current `TimerContext` and `InputContext` are migration bridges. They should lose fields as modules replace them, then be removed when no component depends on them.

## Scope and Owner Identity

Events that belong to one timer instance carry the timer owner ID.

Inside known timer environments:

```text
scopeId === ownerId === timer:<route-session-id-or-primary>
```

Modules must ignore events for other owners/scopes unless they are intentionally application-global.

Device availability remains application-global, but active-device leasing is owner-scoped.

## Constants and Registries

Reusable configuration should be declared outside component usage.

Move these kinds of values into dedicated modules:

- timer tab item definitions;
- timer option selector definitions;
- history penalty options;
- tool registry entries;
- modal type constants;
- keyboard shortcut descriptors;
- dropdown and placement constants;
- repeated class-name constants that represent semantic UI choices.

Suggested locations:

```text
src/lib/timer/timer-ui/timerTabs.ts
src/lib/timer/timer-ui/timerOptions.constants.ts
src/lib/timer/timer-ui/history.constants.ts
src/lib/timer/timer-ui/toolRegistry.ts
src/lib/timer/timer-ui/keyboardShortcuts.ts
```

Instance-specific reactive values may remain inside components.

## Migration Strategy

The migration must stay vertical, testable, and reversible.

### Slice 1: Event Emitter Helpers and Module Contracts

Add small typed emitter helpers and module attach/detach contracts.

No production behavior changes.

Tests:

- emitters publish the correct typed event;
- native timestamps are preserved;
- detach contracts unsubscribe all handlers;
- unknown/unattached events are harmless.

### Slice 2: Timer Projection Extraction

Move the event subscriptions currently inside `Timer.svelte` into projection modules.

Tests:

- solve projection reacts to solve added/updated/removed events;
- scramble projection reacts only to matching scope;
- device projection tracks active device for matching owner;
- projections ignore other timer scopes.

### Slice 3: Scramble and Image UI Migration

Remove `initScrambler` usage from timer UI components.

Components publish scramble/image requests through emitters. Existing services remain attached to the bus.

Tests:

- refresh scramble publishes a request with native timestamp;
- edit/old scramble publish provided-scramble requests;
- solve detail image preview publishes image request and consumes only its result;
- image failures do not break scramble display.

Manual checkpoint:

- initial scramble, refresh, edit, old scramble, and preview image still work.

### Slice 4: Solve UI Migration

Remove solve update/remove/list callbacks from `TimerContext`.

`HistoryTab` publishes solve requests and consumes projection state.

Tests:

- history requests list on mount/session change;
- update/remove publish typed events;
- loaded/updated/removed events update only matching owner/session projection;
- solve detail modal can save without `bind:value={undefined}` regressions.

Manual checkpoint:

- History tab loads existing solves, updates penalties/comments, removes solves, and opens details.

### Slice 5: Session and Device Options Migration

Move session setting changes and active device changes from direct controller/service calls into event modules.

Tests:

- settings dialog publishes session settings change requests;
- persistence module publishes changed/failure events;
- device selector publishes active-device requests;
- lease conflicts produce visible projection state.

Manual checkpoint:

- session settings, input device selection, inspection/prevention settings, image settings, and conflict feedback still work.

### Slice 6: Input Handler Migration

Remove `inputContext` from `TimerTab` and input handlers.

Input handlers emit timer/device/manual-entry events and read only the state required for display.

Tests:

- keyboard/manual/legacy fallback events preserve timestamps;
- timer start/stop/cancel/reset flows still publish the expected sequence;
- `Ctrl`, `Alt`, `Shift`, and `Tab` behavior remains correct.

Manual checkpoint:

- keyboard timer flow, prevention, ready feedback, inspection penalty, and stop-on-keydown still work.

### Slice 7: Timer Shell Cleanup

Remove obsolete bridge code from `Timer.svelte`.

Tests:

- route-level timer mount attaches and detaches modules once;
- module teardown prevents duplicate handlers after remount;
- tab selection state remains correct;
- no direct service imports remain in timer UI shell/components except approved infrastructure context.

Manual checkpoint:

- timer, history, stats, options, modals, and preview work after route navigation/remount.

## Error Handling

Modules publish typed failure events instead of throwing into UI components.

Expected failure examples:

- scramble generation failure;
- image generation final failure;
- solve persistence failure;
- session settings persistence failure;
- active-device lease rejection;
- handler failure.

The event debugger should show both requests and failures. UI projections decide which failures need visible user feedback.

## Testing Strategy

Every migration slice includes tests for the exact parts changed.

Required test types:

- emitter unit tests;
- module attach/detach tests;
- projection filtering tests;
- integration tests using the real EventBus and deterministic event factory;
- component tests only where a UI behavior changes.

Tests should verify that modules ignore events outside their scope and that detached modules do not continue reacting.

## Verification Rules

- Do not build.
- Prefer focused tests for changed modules and components.
- Run lint/format checks on touched files.
- Run `svelte-check` only when explicitly requested or when a type issue cannot be reliably validated otherwise.
- Stop at manual checkpoints so the user can test the actual behavior before the next slice.

## Completion Criteria

This migration design is complete when:

- `Timer.svelte` is a thin shell and module attachment point;
- `TimerTab`, `TimerOptions`, `HistoryTab`, `StatsTab`, and input handlers no longer depend on `inputContext`;
- broad `TimerContext` callback fields are removed or replaced by infrastructure-only context;
- timer UI components do not call persistence/session/scramble/device services directly;
- logical modules attach/detach from the bus independently;
- components publish typed events or use small typed emitter helpers;
- projections own scoped UI state and ignore unrelated scopes;
- reusable UI constants are declared outside component bodies;
- each slice has tests and a manual validation checkpoint;
- the app remains working and reversible between slices.
