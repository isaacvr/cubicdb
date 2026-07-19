# Bus-Attached Timer Module Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the foundational bus-attached module and typed emitter helper pattern that later timer UI migrations will use to remove `inputContext`, broad `TimerContext`, and direct service calls.

**Architecture:** The EventBus remains the communication center. This slice adds small event-family emitters and attach/detach module contracts without introducing a massive application facade. The first production-facing helpers target solve, device, and generation events because those already exist and are currently bridged through `Timer.svelte`.

**Tech Stack:** Svelte 5, TypeScript, Vitest, existing `EventBus<TimerEvent>`, existing `TimerEventFactory`, existing timer/generation event registries.

## Global Constraints

- Do not build.
- Keep the migration vertical, testable, and reversible.
- Do not create one giant object with all application functions.
- Components and modules should need only the bus, event factory or small emitter helpers, and their own `scopeId`/`ownerId`.
- Preserve native browser timestamps when a native input event triggers an emitted event.
- Every event must contain a timestamp and typed payload.
- Run focused tests for changed modules.
- Run lint/format checks on touched files.
- Run `svelte-check` only when explicitly requested or when a type issue cannot be reliably validated otherwise.

---

## File Structure

Create these files:

- `src/lib/events/modules/EventModule.ts`
  - Shared attach/detach contract for logical modules.
- `src/lib/events/modules/EventModule.test.ts`
  - Tests detach behavior and helper subscription cleanup.
- `src/lib/events/emitters/createTypedEventEmitter.ts`
  - Generic typed event publication helper over `EventBus<TimerEvent>` and `TimerEventFactory`.
- `src/lib/events/emitters/createTypedEventEmitter.test.ts`
  - Tests programmatic and native timestamp publication.
- `src/lib/events/emitters/generationEventEmitters.ts`
  - Small generation-family emitters: scramble requested and image requested.
- `src/lib/events/emitters/generationEventEmitters.test.ts`
  - Tests typed generation request publication and request IDs.
- `src/lib/events/emitters/solveEventEmitters.ts`
  - Small solve-family emitters: list, add, update, remove.
- `src/lib/events/emitters/solveEventEmitters.test.ts`
  - Tests owner-scoped solve event publication.
- `src/lib/events/emitters/deviceEventEmitters.ts`
  - Small device-family emitters: active change, active release, owner destroy.
- `src/lib/events/emitters/deviceEventEmitters.test.ts`
  - Tests owner-scoped device event publication.
- `src/lib/events/modules/index.ts`
  - Barrel export for module contracts.
- `src/lib/events/emitters/index.ts`
  - Barrel export for emitter helpers.

Modify these files:

- `src/lib/events/index.ts`
  - Export new `emitters` and `modules` barrels.

Do not modify UI components in this plan. This foundation should be behavior-neutral.

---

### Task 1: Add Event Module Contract

**Files:**

- Create: `src/lib/events/modules/EventModule.ts`
- Create: `src/lib/events/modules/EventModule.test.ts`
- Create: `src/lib/events/modules/index.ts`

**Interfaces:**

- Consumes:
  - `EventSubscription` from `src/lib/events/EventBus.ts`
- Produces:
  - `export interface EventModule { detach(): void }`
  - `export type EventModuleDetach = () => void`
  - `export function createEventModule(subscriptions: EventSubscription[]): EventModule`
  - `export function detachEventModules(modules: readonly EventModule[]): void`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events/modules/EventModule.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { EventSubscription } from "$lib/events/EventBus";
import { createEventModule, detachEventModules } from "./EventModule";

function subscription(unsubscribe = vi.fn()): EventSubscription {
  return { unsubscribe };
}

describe("EventModule", () => {
  it("unsubscribes every subscription exactly once", () => {
    const first = vi.fn();
    const second = vi.fn();
    const module = createEventModule([subscription(first), subscription(second)]);

    module.detach();
    module.detach();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("detaches several modules", () => {
    const first = vi.fn();
    const second = vi.fn();

    detachEventModules([
      createEventModule([subscription(first)]),
      createEventModule([subscription(second)]),
    ]);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/events/modules/EventModule.test.ts
```

Expected: FAIL because `src/lib/events/modules/EventModule.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/events/modules/EventModule.ts`:

```ts
import type { EventSubscription } from "$lib/events/EventBus";

export type EventModuleDetach = () => void;

export interface EventModule {
  detach: EventModuleDetach;
}

export function createEventModule(subscriptions: readonly EventSubscription[]): EventModule {
  let detached = false;

  return {
    detach() {
      if (detached) return;
      detached = true;
      for (const subscription of subscriptions) subscription.unsubscribe();
    },
  };
}

export function detachEventModules(modules: readonly EventModule[]): void {
  for (const module of modules) module.detach();
}
```

Create `src/lib/events/modules/index.ts`:

```ts
export * from "./EventModule";
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/events/modules/EventModule.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/modules/EventModule.ts src/lib/events/modules/EventModule.test.ts src/lib/events/modules/index.ts
git commit -m "feat: add event module detach contract"
```

---

### Task 2: Add Generic Typed Event Emitter

**Files:**

- Create: `src/lib/events/emitters/createTypedEventEmitter.ts`
- Create: `src/lib/events/emitters/createTypedEventEmitter.test.ts`
- Create: `src/lib/events/emitters/index.ts`

**Interfaces:**

- Consumes:
  - `IEventBus<TimerEvent>` from `src/lib/events/EventBus.ts`
  - `TimerEvent`, `TimerEventType` from `src/lib/events/timer/TimerEvent.ts`
  - `TimerEventPayloadMap` from `src/lib/events/timer/TimerEventPayloadMap.ts`
  - `TimerEventFactory`, `NativeTimestampSource` from `src/lib/events/timer/TimerEventFactory.ts`
- Produces:
  - `export interface TypedEventEmitterDependencies`
  - `export interface EmitEventOptions`
  - `export type EmitTypedEvent`
  - `export function createTypedEventEmitter(dependencies): EmitTypedEvent`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events/emitters/createTypedEventEmitter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createTypedEventEmitter } from "./createTypedEventEmitter";

function setup() {
  let now = 100;
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => now }, { next: () => `event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return {
    bus,
    events,
    observed,
    setNow(value: number) {
      now = value;
    },
  };
}

describe("createTypedEventEmitter", () => {
  it("publishes a typed event using the injected clock timestamp", async () => {
    const { bus, events, observed, setNow } = setup();
    const emit = createTypedEventEmitter({ bus, events });

    setNow(456);
    const eventId = await emit(TIMER_EVENTS.SOLVES_LIST_REQUESTED, {
      ownerId: "timer:1",
      query: { sessionId: "session-1" },
    });

    expect(eventId).toBe("event-1");
    expect(observed).toEqual([
      {
        id: "event-1",
        type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        timestamp: 456,
        payload: {
          ownerId: "timer:1",
          query: { sessionId: "session-1" },
        },
      },
    ]);
  });

  it("preserves a native source timestamp", async () => {
    const { bus, events, observed } = setup();
    const emit = createTypedEventEmitter({ bus, events });

    await emit(
      TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
      {
        ownerId: "timer:1",
        deviceId: "cubicdb:device:timer_keyboard",
      },
      { sourceEvent: { timeStamp: 789 } }
    );

    expect(observed[0].timestamp).toBe(789);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/events/emitters/createTypedEventEmitter.test.ts
```

Expected: FAIL because `createTypedEventEmitter.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/events/emitters/createTypedEventEmitter.ts`:

```ts
import type { IEventBus } from "$lib/events/EventBus";
import type { TimerEvent, TimerEventType } from "$lib/events/timer/TimerEvent";
import type { NativeTimestampSource, TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import type { TimerEventPayloadMap } from "$lib/events/timer/TimerEventPayloadMap";

export interface TypedEventEmitterDependencies {
  bus: IEventBus<TimerEvent>;
  events: TimerEventFactory;
}

export interface EmitEventOptions {
  sourceEvent?: NativeTimestampSource;
}

export type EmitTypedEvent = <K extends TimerEventType>(
  type: K,
  payload: TimerEventPayloadMap[K],
  options?: EmitEventOptions
) => Promise<string>;

export function createTypedEventEmitter({
  bus,
  events,
}: TypedEventEmitterDependencies): EmitTypedEvent {
  return async function emit<K extends TimerEventType>(
    type: K,
    payload: TimerEventPayloadMap[K],
    options?: EmitEventOptions
  ): Promise<string> {
    const event = options?.sourceEvent
      ? events.fromNative(type, payload, options.sourceEvent)
      : events.create(type, payload);
    await bus.publish(event);
    return event.id;
  };
}
```

Create `src/lib/events/emitters/index.ts`:

```ts
export * from "./createTypedEventEmitter";
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/events/emitters/createTypedEventEmitter.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/emitters/createTypedEventEmitter.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/index.ts
git commit -m "feat: add typed event emitter helper"
```

---

### Task 3: Add Generation Event Emitters

**Files:**

- Create: `src/lib/events/emitters/generationEventEmitters.ts`
- Create: `src/lib/events/emitters/generationEventEmitters.test.ts`
- Modify: `src/lib/events/emitters/index.ts`

**Interfaces:**

- Consumes:
  - `createTypedEventEmitter`
  - `GENERATION_EVENTS`
  - `ScrambleGenerationConfig`
  - `ImageGenerationConfig`
- Produces:
  - `createGenerationEventEmitters({ bus, events })`
  - `.requestScramble({ scopeId, config, sourceEvent? }): Promise<string>`
  - `.requestImage({ scopeId, config, sourceEvent? }): Promise<string>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events/emitters/generationEventEmitters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import { GENERATION_EVENTS } from "$lib/events/generation";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { createGenerationEventEmitters } from "./generationEventEmitters";

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 321 }, { next: () => `request-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("generationEventEmitters", () => {
  it("publishes scramble requests with scope and config", async () => {
    const { bus, events, observed } = setup();
    const emitters = createGenerationEventEmitters({ bus, events });

    const requestId = await emitters.requestScramble({
      scopeId: "timer:1",
      config: {
        mode: "333",
        count: 1,
        length: 20,
        probability: -1,
        source: "user-requested",
      },
    });

    expect(requestId).toBe("request-1");
    expect(observed[0]).toMatchObject({
      id: "request-1",
      type: GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 321,
      payload: {
        scopeId: "timer:1",
        config: {
          mode: "333",
          count: 1,
          length: 20,
          probability: -1,
          source: "user-requested",
        },
      },
    });
  });

  it("publishes image requests with native timestamps", async () => {
    const { bus, events, observed } = setup();
    const emitters = createGenerationEventEmitters({ bus, events });

    await emitters.requestImage({
      scopeId: "timer:1",
      config: {
        scramble: "R U R'",
        puzzle: "rubik",
        mode: "normal",
        view: "trans",
        order: 3,
      },
      sourceEvent: { timeStamp: 654 },
    });

    expect(observed[0].type).toBe(GENERATION_EVENTS.IMAGE_REQUESTED);
    expect(observed[0].timestamp).toBe(654);
    expect(observed[0].payload).toMatchObject({
      scopeId: "timer:1",
      config: {
        scramble: "R U R'",
        view: "trans",
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/events/emitters/generationEventEmitters.test.ts
```

Expected: FAIL because `generationEventEmitters.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/events/emitters/generationEventEmitters.ts`:

```ts
import { GENERATION_EVENTS } from "$lib/events/generation";
import type { ImageGenerationConfig, ScrambleGenerationConfig } from "$lib/events/generation";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

export interface GenerationRequestEmitterInput<TConfig> {
  scopeId: string;
  config: TConfig;
  sourceEvent?: NativeTimestampSource;
}

export function createGenerationEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestScramble(input: GenerationRequestEmitterInput<ScrambleGenerationConfig>) {
      return emit(
        GENERATION_EVENTS.SCRAMBLE_REQUESTED,
        { scopeId: input.scopeId, config: input.config },
        input.sourceEvent ? { sourceEvent: input.sourceEvent } : undefined
      );
    },
    requestImage(input: GenerationRequestEmitterInput<ImageGenerationConfig>) {
      return emit(
        GENERATION_EVENTS.IMAGE_REQUESTED,
        { scopeId: input.scopeId, config: input.config },
        input.sourceEvent ? { sourceEvent: input.sourceEvent } : undefined
      );
    },
  };
}
```

Append to `src/lib/events/emitters/index.ts`:

```ts
export * from "./generationEventEmitters";
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/events/emitters/generationEventEmitters.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/emitters/generationEventEmitters.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/index.ts
git commit -m "feat: add generation event emitters"
```

---

### Task 4: Add Solve Event Emitters

**Files:**

- Create: `src/lib/events/emitters/solveEventEmitters.ts`
- Create: `src/lib/events/emitters/solveEventEmitters.test.ts`
- Modify: `src/lib/events/emitters/index.ts`

**Interfaces:**

- Consumes:
  - `createTypedEventEmitter`
  - `TIMER_EVENTS`
  - `Solve`, `NativeTimestampSource`, `SolveListQuery`
- Produces:
  - `createSolveEventEmitters({ bus, events })`
  - `.requestList({ ownerId, query?, sourceEvent? }): Promise<string>`
  - `.requestAdd({ ownerId, solve, sourceEvent? }): Promise<string>`
  - `.requestUpdate({ ownerId, solve, sourceEvent? }): Promise<string>`
  - `.requestRemove({ ownerId, solves, sourceEvent? }): Promise<string>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events/emitters/solveEventEmitters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { Penalty, type Solve } from "@interfaces";
import { createSolveEventEmitters } from "./solveEventEmitters";

const solve: Solve = {
  _id: "solve-1",
  session: "session-1",
  group: 0,
  mode: "333",
  len: 20,
  prob: -1,
  time: 12345,
  penalty: Penalty.NONE,
  scramble: "R U R'",
  date: 1,
  selected: false,
  comments: "",
};

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 1000 }, { next: () => `solve-event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("solveEventEmitters", () => {
  it("publishes solve list requests with owner and query", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestList({
      ownerId: "timer:1",
      query: { sessionId: "session-1" },
    });

    expect(observed[0]).toMatchObject({
      type: TIMER_EVENTS.SOLVES_LIST_REQUESTED,
      payload: {
        ownerId: "timer:1",
        query: { sessionId: "session-1" },
      },
    });
  });

  it("publishes add, update, and remove requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestAdd({ ownerId: "timer:1", solve });
    await emitters.requestUpdate({ ownerId: "timer:1", solve });
    await emitters.requestRemove({ ownerId: "timer:1", solves: [solve] });

    expect(observed.map(event => event.type)).toEqual([
      TIMER_EVENTS.SOLVE_ADD_REQUESTED,
      TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
      TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
    ]);
    expect(observed[2].payload).toMatchObject({
      ownerId: "timer:1",
      solves: [solve],
    });
  });

  it("preserves native timestamps for solve updates", async () => {
    const { bus, events, observed } = setup();
    const emitters = createSolveEventEmitters({ bus, events });

    await emitters.requestUpdate({
      ownerId: "timer:1",
      solve,
      sourceEvent: { timeStamp: 42 },
    });

    expect(observed[0].timestamp).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/events/emitters/solveEventEmitters.test.ts
```

Expected: FAIL because `solveEventEmitters.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/events/emitters/solveEventEmitters.ts`:

```ts
import type { Solve } from "@interfaces";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import type { SolveListQuery } from "$lib/timer/solves/SolveListQuery";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

interface OwnerScopedEmitterInput {
  ownerId: string;
  sourceEvent?: NativeTimestampSource;
}

export interface SolveListRequestEmitterInput extends OwnerScopedEmitterInput {
  query?: SolveListQuery;
}

export interface SolveAddRequestEmitterInput extends OwnerScopedEmitterInput {
  solve: Partial<Solve>;
}

export interface SolveUpdateRequestEmitterInput extends OwnerScopedEmitterInput {
  solve: Solve;
}

export interface SolvesRemoveRequestEmitterInput extends OwnerScopedEmitterInput {
  solves: Solve[];
}

function options(sourceEvent?: NativeTimestampSource) {
  return sourceEvent ? { sourceEvent } : undefined;
}

export function createSolveEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestList(input: SolveListRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVES_LIST_REQUESTED,
        { ownerId: input.ownerId, query: input.query },
        options(input.sourceEvent)
      );
    },
    requestAdd(input: SolveAddRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_ADD_REQUESTED,
        { ownerId: input.ownerId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestUpdate(input: SolveUpdateRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVE_UPDATE_REQUESTED,
        { ownerId: input.ownerId, solve: input.solve },
        options(input.sourceEvent)
      );
    },
    requestRemove(input: SolvesRemoveRequestEmitterInput) {
      return emit(
        TIMER_EVENTS.SOLVES_REMOVE_REQUESTED,
        { ownerId: input.ownerId, solves: input.solves },
        options(input.sourceEvent)
      );
    },
  };
}
```

Append to `src/lib/events/emitters/index.ts`:

```ts
export * from "./solveEventEmitters";
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/events/emitters/solveEventEmitters.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/index.ts
git commit -m "feat: add solve event emitters"
```

---

### Task 5: Add Device Event Emitters

**Files:**

- Create: `src/lib/events/emitters/deviceEventEmitters.ts`
- Create: `src/lib/events/emitters/deviceEventEmitters.test.ts`
- Modify: `src/lib/events/emitters/index.ts`

**Interfaces:**

- Consumes:
  - `createTypedEventEmitter`
  - `TIMER_EVENTS`
  - `NativeTimestampSource`
- Produces:
  - `createDeviceEventEmitters({ bus, events })`
  - `.requestActiveDevice({ ownerId, deviceId, sourceEvent? }): Promise<string>`
  - `.requestActiveDeviceRelease({ ownerId, deviceId, sourceEvent? }): Promise<string>`
  - `.requestOwnerDestroy({ ownerId, sourceEvent? }): Promise<string>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events/emitters/deviceEventEmitters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import { createDeviceEventEmitters } from "./deviceEventEmitters";

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 123 }, { next: () => `device-event-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("deviceEventEmitters", () => {
  it("publishes active device change and release requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createDeviceEventEmitters({ bus, events });

    await emitters.requestActiveDevice({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });
    await emitters.requestActiveDeviceRelease({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });

    expect(observed.map(event => event.type)).toEqual([
      TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
      TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
    ]);
    expect(observed[0].payload).toEqual({
      ownerId: "timer:1",
      deviceId: "cubicdb:device:timer_keyboard",
    });
  });

  it("publishes owner destroy requests", async () => {
    const { bus, events, observed } = setup();
    const emitters = createDeviceEventEmitters({ bus, events });

    await emitters.requestOwnerDestroy({
      ownerId: "timer:1",
      sourceEvent: { timeStamp: 987 },
    });

    expect(observed[0]).toMatchObject({
      type: TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
      timestamp: 987,
      payload: { ownerId: "timer:1" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/events/emitters/deviceEventEmitters.test.ts
```

Expected: FAIL because `deviceEventEmitters.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/events/emitters/deviceEventEmitters.ts`:

```ts
import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

interface OwnerScopedEmitterInput {
  ownerId: string;
  sourceEvent?: NativeTimestampSource;
}

export interface ActiveDeviceEmitterInput extends OwnerScopedEmitterInput {
  deviceId: string;
}

function options(sourceEvent?: NativeTimestampSource) {
  return sourceEvent ? { sourceEvent } : undefined;
}

export function createDeviceEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestActiveDevice(input: ActiveDeviceEmitterInput) {
      return emit(
        TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
        { ownerId: input.ownerId, deviceId: input.deviceId },
        options(input.sourceEvent)
      );
    },
    requestActiveDeviceRelease(input: ActiveDeviceEmitterInput) {
      return emit(
        TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
        { ownerId: input.ownerId, deviceId: input.deviceId },
        options(input.sourceEvent)
      );
    },
    requestOwnerDestroy(input: OwnerScopedEmitterInput) {
      return emit(
        TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
        { ownerId: input.ownerId },
        options(input.sourceEvent)
      );
    },
  };
}
```

Append to `src/lib/events/emitters/index.ts`:

```ts
export * from "./deviceEventEmitters";
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/events/emitters/deviceEventEmitters.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/emitters/deviceEventEmitters.ts src/lib/events/emitters/deviceEventEmitters.test.ts src/lib/events/emitters/index.ts
git commit -m "feat: add device event emitters"
```

---

### Task 6: Export Foundation APIs

**Files:**

- Modify: `src/lib/events/index.ts`
- Test: `src/lib/events/emitters/createTypedEventEmitter.test.ts`
- Test: `src/lib/events/modules/EventModule.test.ts`

**Interfaces:**

- Consumes:
  - `src/lib/events/emitters/index.ts`
  - `src/lib/events/modules/index.ts`
- Produces:
  - Public exports from `$lib/events` for emitters and module contracts.

- [ ] **Step 1: Inspect the current events barrel**

Run:

```bash
Get-Content src/lib/events/index.ts
```

Expected: existing barrel exports. Keep all existing exports.

- [ ] **Step 2: Modify the events barrel**

Append these exports to `src/lib/events/index.ts`:

```ts
export * from "./emitters";
export * from "./modules";
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npx vitest run src/lib/events/modules/EventModule.test.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/deviceEventEmitters.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 4: Run lint and format checks**

Run:

```bash
npx prettier --check src/lib/events/modules/EventModule.ts src/lib/events/modules/EventModule.test.ts src/lib/events/modules/index.ts src/lib/events/emitters/createTypedEventEmitter.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/generationEventEmitters.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/deviceEventEmitters.ts src/lib/events/emitters/deviceEventEmitters.test.ts src/lib/events/emitters/index.ts src/lib/events/index.ts
```

Expected: PASS. If it fails with style issues, run this exact command and rerun the check:

```bash
npx prettier --write src/lib/events/modules/EventModule.ts src/lib/events/modules/EventModule.test.ts src/lib/events/modules/index.ts src/lib/events/emitters/createTypedEventEmitter.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/generationEventEmitters.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/deviceEventEmitters.ts src/lib/events/emitters/deviceEventEmitters.test.ts src/lib/events/emitters/index.ts src/lib/events/index.ts
```

Run:

```bash
npx eslint src/lib/events/modules/EventModule.ts src/lib/events/modules/EventModule.test.ts src/lib/events/modules/index.ts src/lib/events/emitters/createTypedEventEmitter.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/generationEventEmitters.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/solveEventEmitters.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/deviceEventEmitters.ts src/lib/events/emitters/deviceEventEmitters.test.ts src/lib/events/emitters/index.ts src/lib/events/index.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/index.ts src/lib/events/modules src/lib/events/emitters
git commit -m "feat: export bus-attached event foundation"
```

---

### Task 7: Post-Foundation Status Check

**Files:**

- No source changes expected.

**Interfaces:**

- Consumes:
  - All APIs from Tasks 1 through 6.
- Produces:
  - A concise implementation status note for the next migration slice.

- [ ] **Step 1: Check git status**

Run:

```bash
git status --short
```

Expected: clean working tree.

- [ ] **Step 2: Run the complete foundation test set**

Run:

```bash
npx vitest run src/lib/events/modules/EventModule.test.ts src/lib/events/emitters/createTypedEventEmitter.test.ts src/lib/events/emitters/generationEventEmitters.test.ts src/lib/events/emitters/solveEventEmitters.test.ts src/lib/events/emitters/deviceEventEmitters.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 3: Prepare handoff note**

Use this exact status structure in the final response:

```text
Foundation slice complete.

Added:
- attach/detach EventModule contract;
- generic typed event emitter;
- generation event emitters;
- solve event emitters;
- device event emitters;
- public exports.

Verified:
- focused Vitest foundation suite passed;
- Prettier check passed;
- ESLint check passed;
- no build run.

Next recommended slice:
- Timer projection extraction from Timer.svelte.
```

No commit is required for this task if the tree is already clean.

---

## Self-Review

Spec coverage:

- Bus-centered architecture: covered by Tasks 1 and 2.
- Attachable/detachable logical modules: covered by Task 1.
- Small typed emitter helpers instead of a massive facade: covered by Tasks 2 through 5.
- Native timestamp preservation: covered by Tasks 2 through 5.
- Reversible migration with no UI behavior change: enforced by file scope and Task 7.
- Tests for each changed part: covered in each task.

Red-flag scan:

- The plan contains no incomplete markers or unspecified implementation steps.
- Every source file created by the plan includes exact code.
- Every verification step includes exact commands and expected results.

Type consistency:

- All emitters use `TypedEventEmitterDependencies`.
- All source timestamp options use `NativeTimestampSource`.
- All owner-scoped timer events use `ownerId`.
- Generation events use `scopeId`.
- The generic emitter returns the created event ID as `Promise<string>`.
