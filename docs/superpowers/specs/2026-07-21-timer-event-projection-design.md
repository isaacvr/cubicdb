# Timer Event Projection Design

**Date:** 2026-07-21

**Status:** Approved direction pending written-spec review

**Scope:** Complete the next Timer migration slice by introducing Redux-like, owner-scoped event projections while preserving current behavior and the existing Figma design.

**Figma source:**

- File: `MDdUdXPhXCSSHKGL2rzBkT`
- Timer desktop frames: `1249:17243` and `5218:10057`
- Foundations: `4:17`
- Components: `4:16`

## Purpose

The application already has a typed `EventBus`, event factory, event-family emitters, a shared application runtime, service implementations, and an initial `TimerReactor`. The remaining Timer UI still combines that system with `TimerController`, writable stores, manager utilities, broad contexts, direct service/controller calls, inline subscriptions, and parent callback tunnels.

The next slice establishes one consistent event flow resembling Redux without adopting Redux as a dependency:

```text
UI or device
  -> feature facade (`useSolve()`, `useScramble()`, etc.)
  -> typed event emitter
  -> EventBus
  -> service module and/or projection module
  -> result event
  -> owner-scoped readonly projection
  -> Svelte UI
```

The event stream is the internal communication mechanism. Projections are the reactive state exposed through small feature facades. Components call readable, React-hook-style APIs and render their state; they do not know about the EventBus, event envelopes, persistence, generation, device leasing, or sibling updates.

## Redux-Like Mapping

| Redux concept | CubicDB equivalent | Responsibility |
|---|---|---|
| Action | Typed domain event | Immutable request, fact, result, or failure |
| Action creator | Small typed event emitter | Creates the correct event envelope and preserves native timestamps |
| Dispatch | `EventBus.publish` | Queues and delivers the event sequentially |
| Middleware/effect | Service module | Performs persistence, generation, device, or other external work and emits results |
| Reducer | Projection handler | Applies matching result/fact events to owner-scoped reactive state |
| Store selector | Readonly projection view | Exposes only the state a UI component needs |
| Store setup | Timer/application runtime | Attaches modules and guarantees teardown |
| React hook | Feature facade such as `useSolve()` | Presents reactive state and commands while hiding all event infrastructure |

This mapping is conceptual. CubicDB retains domain-specific events, async publication, direct high-frequency timer readings, and independently attachable modules.

## Architectural Rules

1. Svelte components consume small feature facades such as `useSolve()`, `useScramble()`, and `useTimerDevice()`.
2. Feature facades publish typed events through small event-family emitters and expose readonly projection state.
3. Components do not import the EventBus, event factory, event registry, emitters, persistence ports, or environment adapters.
4. Components never build event envelopes by hand.
5. Request events express intent. Result/fact events are the only events that update projections.
6. Service modules consume requests, perform work, and publish success or failure events.
7. Projection modules consume facts/results and synchronously update reactive state.
8. Every Timer projection filters owner-scoped events by `ownerId` and generation events by `scopeId`.
9. Programmatic events use the application monotonic clock. Browser/device events preserve their native timestamp.
10. High-frequency elapsed-time readings continue through the direct callback channel and do not enter the EventBus.
11. All module attachment returns an idempotent detach operation.
12. Detached modules must stop reacting, including after Timer route remounts.
13. Expected failures become typed failure events and feature-level `Result` values; storage or transport errors do not escape directly into components.
14. The migration preserves current behavior and follows the existing Figma visual design. It does not add Timer features.

## Runtime Boundaries

### Application Runtime

The root layout continues to create one `TimerApplicationRuntime` and place it in Svelte context. It owns application-wide infrastructure:

- EventBus and event factory;
- event logging;
- device catalog and device manager;
- scramble and image-generation services;
- solve persistence service;
- shared managed keyboard device and native boundary.

This slice does not migrate the root layout's remaining legacy session loading or saved legacy-device hydration. Those are secondary follow-up work after the Timer shell migration.

### Timer Runtime

Each mounted Timer creates one owner-scoped runtime using:

```text
ownerId = scopeId = timer:<route-session-id-or-primary>
```

The Timer runtime attaches only the modules required by that Timer instance and exposes:

- feature-facade dependencies through internal context;
- owner-scoped readonly projections for those facades;
- the owner ID;
- readiness and teardown.

It must not become a large command facade. Existing methods such as `requestSolveUpdate` are migration bridges and should be replaced at component boundaries by focused feature facades. Event-family emitters remain private dependencies of those facades.

## Feature Facades

Feature facades are the only application-data API used by Timer UI components. They preserve the best property of the former `dataService` structure—a stable API independent of browser, Electron, IPC, or database technology—while adding owner-scoped reactive state and event-driven coordination.

The preferred component shape is:

```svelte
<script lang="ts">
  const solve = useSolve();

  onMount(() => solve.loadBySession($session._id));
</script>

<button onclick={() => solve.update(tmpSolve)}>Save edited solve</button>

{#each solve.items as item (item._id)}
  <!-- render item -->
{/each}
```

Keep the facade object intact in components. Destructuring a live getter can capture its current value and lose reactivity when a projection replaces an array.

Each facade has three responsibilities:

- expose readonly reactive projection state through getters;
- expose domain-readable commands;
- translate commands into typed event publication and correlated results.

For example, `useSolve()` exposes:

```ts
interface SolveFeature {
  readonly items: readonly Solve[];
  readonly loading: boolean;
  readonly error: SolveFeatureError | null;
  loadBySession(sessionId: string): Promise<Result<void, SolveFeatureError>>;
  add(solve: Partial<Solve>): Promise<Result<Solve, SolveFeatureError>>;
  update(solve: Solve): Promise<Result<Solve, SolveFeatureError>>;
  remove(solves: readonly Solve[]): Promise<Result<readonly Solve[], SolveFeatureError>>;
}
```

Expected command failures return `Result` and also update reactive error state. This lets a modal decide whether to close after a save while the rest of the UI can render or notify from the same failure projection. Facades correlate result/failure events internally; components never handle request IDs.

The initial Timer feature facades are:

- `useTimer()` for lifecycle/display state and input commands;
- `useSolve()` for solve queries and mutations;
- `useScramble()` for scramble and preview commands/state;
- `useTimerSession()` for selected-session settings;
- `useTimerDevice()` for catalog and active-device state;
- `useTimerStatistics()` for statistics state.

Facades are thin adapters, not service locators and not containers for business logic. Service modules, projection modules, and environment adapters remain independently testable behind them.

## Projection Modules

The first implementation slice introduces focused projections rather than one monolithic Timer store.

### Timer Lifecycle Projection

Owns display state derived from device lifecycle events:

- timer state;
- elapsed time from the direct reading channel;
- readiness indicator;
- inspection penalty;
- step readings;
- decimal visibility.

The existing `TimerReactor` may be adapted into this module if doing so keeps its public responsibility narrow and teardown explicit.

### Solve Projection

Owns the current Timer's solve collection and selection-compatible state. It reacts to:

- solve list loaded;
- solve added;
- solve updated;
- solves removed;
- relevant persistence failures.

It ignores events for other owners. Session filtering remains explicit in the request and result payloads; it is not inferred from global controller state.

### Scramble Projection

Owns:

- current scramble;
- active scramble request ID;
- scramble failure state;
- preview images;
- active preview request ID;
- preview enabled/loading state.

It accepts only results matching both the Timer scope and the latest tracked request. Stale results cannot replace a newer scramble or preview.

### Session Projection

Owns the selected session and the settings required by Timer UI and devices. In this first slice it may be hydrated through an explicit bridge from existing session loading, but components must read the projection rather than importing the controller directly.

### Device Projection

Owns available device descriptors, requested device, active device, and lease failure state for the Timer owner. Application-global discovery facts may be shared, but active-device state remains owner-scoped.

### Statistics Projection

Initially exposes the statistics already produced from the solve collection without changing calculation behavior. Moving calculation into a dedicated statistics service is a later vertical slice; the UI boundary should already consume a readonly projection.

## Event Categories and Data Flow

Events are grouped by meaning:

- **Requests:** user, route, or device intent such as requesting a scramble or updating a solve.
- **Facts/results:** completed state changes such as `SOLVE_UPDATED` or `SCRAMBLE_GENERATED`.
- **Failures:** expected operational failures with enough owner/scope and request identity for projections and debugging.
- **Lifecycle facts:** device transitions such as ready, running, stopped, or cancelled.

Example solve update:

```text
HistoryTab
  -> useSolve().update(solve, nativeEvent)
  -> solveEventEmitters.requestUpdate(ownerId, solve, nativeEvent)
  -> SOLVE_UPDATE_REQUESTED
  -> SolvePersistenceModule
  -> SOLVE_UPDATED or SOLVE_UPDATE_FAILED
  -> SolveProjection
  -> HistoryTab rerenders
```

Example scramble refresh:

```text
TimerOptions
  -> useScramble().refresh(config, nativeEvent)
  -> generationEventEmitters.requestScrambles(scopeId, config, nativeEvent)
  -> SCRAMBLE_REQUESTED
  -> ScrambleService
  -> SCRAMBLE_GENERATED or SCRAMBLE_FAILED
  -> ScrambleProjection
  -> preview request when configured
  -> ImageGenerationService
  -> ScrambleProjection
  -> TimerTab rerenders
```

## Svelte Component Boundaries

### `Timer.svelte`

Becomes a thin shell responsible for:

- deriving `ownerId` from the route;
- obtaining the shared application runtime;
- creating and destroying the owner-scoped Timer runtime;
- rendering the Figma-aligned Timer layout;
- supplying the internal context used by feature facades.

It no longer owns inline bus subscriptions, manager utilities, solve-selection callbacks, scramble callbacks, or reusable tab configuration.

### `TimerTab.svelte`

Uses `useTimer()`, `useScramble()`, and `useTimerDevice()` to render lifecycle, scramble, preview, and active-device state and invoke commands. Native input boundaries emit events internally. Approved platform integration such as preventing sleep belongs behind a small boundary module, not a direct general-purpose data-service dependency.

### `TimerOptions.svelte`

Matches the Figma options experience and invokes feature-facade commands for scramble refresh, provided/previous scramble use, session setting changes, active-device changes, and other existing controls. It does not call `sessionController`, `dataService`, an event emitter, or an `initInputHandler` callback.

### `HistoryTab.svelte`

Uses `useSolve()` for solve lists and mutations and `useScramble()` for solve-preview generation. Modal open state, pagination, filtering, and temporary editing state may remain local.

### `StatsTab.svelte`

Uses `useTimerStatistics()` for statistics state. Chart instances and presentation-only interaction remain local to the component.

## Figma Design Contract

The event migration must not regress the approved Timer design:

- compact top controls row;
- segmented Timer, History, and Statistics tabs;
- flexible left column with scramble and timer panels;
- approximately `264px` right rail with preview and statistics panels;
- approximately `8px` spacing and `12px` panel radii;
- dark semantic surfaces with blue/teal emphasis;
- monospace scramble content;
- large timer display with muted fractional digits;
- Lucide icons in application code;
- responsive right-rail collapse on narrow screens;
- Figma-aligned options modal grouping, fields, switches, and actions.

Existing semantic theme variables and CubicDB UI primitives remain the implementation source. Raw Figma colors and absolute positioning are references, not copied application structure.

## Migration Sequence

1. Add projection contracts and focused unit tests.
2. Extract current lifecycle and inline solve subscriptions into owner-scoped projection modules.
3. Add owner-scoped feature facades and expose only those facades to components.
4. Migrate scramble and preview UI requests.
5. Migrate History solve list/update/remove and solve-preview requests.
6. Migrate session and device options, preserving the Figma options design.
7. Migrate managed and legacy input-handler boundaries.
8. Migrate statistics reads and remove cross-component refresh callbacks.
9. Remove `InputContext`, broad `TimerContext`, inline subscriptions, and obsolete runtime request facades.
10. Add a production-boundary contract preventing reintroduction of forbidden direct Timer UI dependencies.
11. Update stale architecture status documents to reflect measured implementation state.

Each step is a reversible vertical commit with focused automated verification and a manual Timer checkpoint.

## Error Handling

- Service modules catch expected operational errors and publish typed failure events.
- Failure events carry `ownerId` or `scopeId`, request identity where relevant, and a normalized error payload.
- Projections ignore unrelated and stale failures.
- Feature facades correlate results/failures and return typed `Result` values.
- UI components may render facade error state or trigger the existing notification boundary without knowing the underlying transport error.
- Event-handler bugs remain observable through the event logger and must not silently corrupt projection state.

## Testing

### Unit tests

- Each projection applies its supported events.
- Each projection ignores other owners/scopes.
- Scramble and preview projections ignore stale request IDs.
- Detach is idempotent and stops all reactions.
- Event emitters preserve native timestamps.
- Feature facades expose reactive getters without leaking event infrastructure.
- Feature commands correlate success/failure events and return the expected `Result`.

### Integration tests

- Real EventBus request -> service -> result -> projection flows.
- Timer mount/remount does not duplicate handlers.
- Keyboard lifecycle still produces the existing visual and persistence behavior.
- Solve completion persists once and requests the next scramble once.
- Service failure produces one failure event and stable projection state.

### Component and source contracts

- Timer UI components use feature facades rather than importing event infrastructure, services, or controllers.
- `Timer.svelte` contains no inline event subscriptions after cleanup.
- `InputContext` and broad `TimerContext` disappear from production Timer UI.
- Figma-aligned layout and options-dialog contracts remain present.

### Manual checkpoints

- Keyboard prevention, ready, inspection, running, stop, cancel, and penalties.
- Manual, Stackmat, virtual, and GAN flows.
- Initial, refreshed, edited, previous, and post-solve scrambles.
- Preview images and preview failure.
- History load, select, edit, remove, filter, paginate, and solve modal.
- Statistics and session/device settings.
- Route navigation and remount teardown.
- Desktop and narrow Figma layout parity.

Do not run a production build or `svelte-check` for these migration slices unless explicitly requested. Use focused Vitest, ESLint, and formatting checks.

## Completion Criteria

The Timer migration is complete when:

- all Timer UI data access uses small feature facades backed by typed event publication and readonly projections;
- components do not know which environment or persistence technology implements a feature;
- service modules own asynchronous work and publish typed results/failures;
- projection modules are owner-scoped, independently attachable, and detachable;
- high-frequency readings remain outside the EventBus;
- `Timer.svelte` is a thin composition and layout shell;
- Timer UI no longer depends on `InputContext`, broad `TimerContext`, direct controller/service calls, or sibling callbacks;
- all existing Timer behavior passes automated and manual regression checks;
- the Timer and options UI remain faithful to the referenced Figma design;
- stale architecture status documents are corrected after the production migration is measured.
