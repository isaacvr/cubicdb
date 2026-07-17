# Scoped Generation Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace timer-specific scramble and preview publication with scope-bound generation clients for scrambles and images.

**Architecture:** The application runtime keeps one custom EventBus and owns application-scoped generation services. Feature code receives a `GenerationClient` bound to a stable `scopeId`, and the client hides event names, envelopes, timestamps, request IDs, scope filtering, and teardown. Scramble generation and image generation stay separate contracts and services, even if a future adapter delegates both to `cubicdb-module`.

**Tech Stack:** Svelte 5 runes, TypeScript, Vitest, existing custom `EventBus`, existing `TimerEventFactory`, cstimer scramble adapter, existing cube rendering helpers.

## Global Constraints

- Do not run build commands.
- Do not run `svelte-check`.
- Use focused Vitest runs for each task and `npm run lint` only at the end of a checkpoint.
- Every event envelope must contain `id`, `type`, `timestamp`, and typed `payload`.
- Native input-triggered requests must preserve `sourceEvent.timeStamp`.
- Programmatic and service-produced events must use the injected monotonic clock.
- Timer generation scope IDs must exactly match the timer ID, with no prefix translation.
- All scramble and image results use arrays, even for single-item requests.
- Image generation retries up to three total attempts and then publishes one final failure.
- Components must use the generation client and must not import generation event names or publish generation envelopes directly.
- Stop for user testing after timer scramble integration and after timer image integration.

---

## File Structure

- Create `src/lib/events/generation/GenerationEventRegistry.ts` for generic generation event names.
- Create `src/lib/events/generation/GenerationEventTypes.ts` for shared generation payload/config/result/error types.
- Create `src/lib/events/generation/GenerationEventPayloadMap.ts` for typed generation payloads.
- Create `src/lib/events/generation/GenerationEvent.ts` for generic event-envelope union types.
- Create `src/lib/events/generation/GenerationClient.ts` for the scope-bound public API.
- Create `src/lib/events/generation/index.ts` to export the public generation surface.
- Modify `src/lib/events/timer/TimerEventRegistry.ts`, `TimerEventPayloadMap.ts`, and `TimerEvent.ts` to temporarily include generation events in the current application bus union.
- Modify `src/lib/events/timer/TimerEventFactory.ts` so the current factory can create generation events while the app event type is still named `TimerEvent`.
- Modify `src/lib/timer/scramble/ScrambleService.ts` so it consumes generic `generation.scramble.requested` events and publishes generic results.
- Create `src/lib/timer/scramble/ScrambleGenerationAdapter.ts` if needed to preserve the existing `IScrambleGenerator` loop behind the new service contract.
- Modify `src/lib/timer/scramble/ScramblePreviewService.ts` into a generic image service consumer.
- Modify `src/lib/timer/scramble/IScramblePreviewGenerator.ts` and `CubeBundleScramblePreviewGenerator.ts` so the adapter accepts `ImageGenerationConfig`, including `CubeMode` and `CubeView`.
- Modify `src/lib/timer/TimerApplicationRuntime.ts` to expose `createGenerationClient(scopeId)` and compose the scramble and image services.
- Modify `src/lib/timer/TimerCompositionRoot.svelte.ts` to use the scope-bound generation client for timer lifecycle scramble requests.
- Modify `src/lib/timer/handlers/registerScrambleHandlers.ts` or replace it with a generation projection that listens through the client.
- Modify `src/lib/timer/TimerState.svelte.ts` to track accepted image request and preview images.
- Modify `src/lib/timer/Timer.svelte` to mirror accepted scramble and preview state into the legacy `TimerController` display stores during migration.
- Modify `src/lib/components/EventDebugPanel.svelte` only if generation event icons/categories need explicit support.

## Task 1: Generic Generation Event Contracts

**Files:**
- Create: `src/lib/events/generation/GenerationEventRegistry.ts`
- Create: `src/lib/events/generation/GenerationEventTypes.ts`
- Create: `src/lib/events/generation/GenerationEventPayloadMap.ts`
- Create: `src/lib/events/generation/GenerationEvent.ts`
- Create: `src/lib/events/generation/index.ts`
- Create: `src/lib/events/generation/GenerationEventTypes.test-d.ts`
- Modify: `src/lib/events/timer/TimerEventRegistry.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/TimerEvent.ts`
- Modify: `src/lib/events/timer/TimerEventFactory.ts`

**Interfaces:**
- Consumes: existing `TimerEventFactory.create(type, payload)` and `TimerEventFactory.fromNative(type, payload, nativeEvent)`.
- Produces: `GENERATION_EVENTS`, `GenerationEventPayloadMap`, `GenerationEvent`, `ScrambleGenerationConfig`, `ImageGenerationConfig`, `ScrambleGenerationResult`, `ImageGenerationResult`, `GenerationFailurePayload`.

- [ ] **Step 1: Write the failing type contract test**

Create `src/lib/events/generation/GenerationEventTypes.test-d.ts`:

```ts
import { expectTypeOf } from 'vitest';
import { CubeMode } from '@constants';
import type { CubeView, PuzzleType } from '@interfaces';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import type {
  GenerationEvent,
  GenerationEventPayloadMap,
  ImageGenerationConfig,
  ScrambleGenerationResult,
} from './GenerationEventTypes';

expectTypeOf(GENERATION_EVENTS.SCRAMBLE_REQUESTED).toEqualTypeOf<'generation.scramble.requested'>();
expectTypeOf(GENERATION_EVENTS.IMAGE_RETRYING).toEqualTypeOf<'generation.image.retrying'>();

expectTypeOf<GenerationEvent>().toMatchTypeOf<{
  id: string;
  type: string;
  timestamp: number;
  payload: object;
}>();

expectTypeOf<GenerationEventPayloadMap[typeof GENERATION_EVENTS.SCRAMBLE_REQUESTED]>()
  .toEqualTypeOf<{
    scopeId: string;
    config: {
      mode: string;
      count?: number;
      length?: number;
      probability?: number | number[];
      providedScramble?: string;
      source?: string;
    };
  }>();

expectTypeOf<ImageGenerationConfig>().toEqualTypeOf<{
  scramble: string;
  puzzle: PuzzleType;
  mode: CubeMode;
  view: CubeView;
  order?: number | number[];
}>();

expectTypeOf<ScrambleGenerationResult>().toEqualTypeOf<{
  scopeId: string;
  requestId: string;
  scrambles: string[];
}>();
```

- [ ] **Step 2: Run the type contract test and verify it fails**

Run: `npx vitest run src/lib/events/generation/GenerationEventTypes.test-d.ts`

Expected: FAIL because `src/lib/events/generation/*` does not exist.

- [ ] **Step 3: Add generic generation contracts**

Create `src/lib/events/generation/GenerationEventRegistry.ts`:

```ts
export const GENERATION_EVENTS = {
  SCRAMBLE_REQUESTED: 'generation.scramble.requested',
  SCRAMBLE_GENERATED: 'generation.scramble.generated',
  SCRAMBLE_FAILED: 'generation.scramble.failed',
  IMAGE_REQUESTED: 'generation.image.requested',
  IMAGE_GENERATED: 'generation.image.generated',
  IMAGE_RETRYING: 'generation.image.retrying',
  IMAGE_FAILED: 'generation.image.failed',
} as const;

export type GenerationEventType = (typeof GENERATION_EVENTS)[keyof typeof GENERATION_EVENTS];
```

Create `src/lib/events/generation/GenerationEventTypes.ts`:

```ts
import type { CubeMode } from '@constants';
import type { CubeView, PuzzleType } from '@interfaces';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import type { GenerationEventPayloadMap } from './GenerationEventPayloadMap';

export type GenerationProbability = number | number[];

export interface GenerationError {
  name: string;
  message: string;
}

export interface ScrambleGenerationConfig {
  mode: string;
  count?: number;
  length?: number;
  probability?: GenerationProbability;
  providedScramble?: string;
  source?: string;
}

export interface ImageGenerationConfig {
  scramble: string;
  puzzle: PuzzleType;
  mode: CubeMode;
  view: CubeView;
  order?: number | number[];
}

export interface ScrambleGenerationResult {
  scopeId: string;
  requestId: string;
  scrambles: string[];
}

export interface ImageGenerationResult {
  scopeId: string;
  requestId: string;
  images: string[];
}

export interface GenerationFailurePayload {
  scopeId: string;
  requestId: string;
  errors: GenerationError[];
}

export interface ImageGenerationRetryPayload {
  scopeId: string;
  requestId: string;
  attempt: number;
  error: GenerationError;
}

export type GenerationEvent<K extends keyof GenerationEventPayloadMap = keyof GenerationEventPayloadMap> =
  K extends keyof GenerationEventPayloadMap ? {
    id: string;
    type: K;
    timestamp: number;
    payload: GenerationEventPayloadMap[K];
  } : never;

export const GENERATION_EVENT_GROUPS = {
  SCRAMBLE: [
    GENERATION_EVENTS.SCRAMBLE_REQUESTED,
    GENERATION_EVENTS.SCRAMBLE_GENERATED,
    GENERATION_EVENTS.SCRAMBLE_FAILED,
  ],
  IMAGE: [
    GENERATION_EVENTS.IMAGE_REQUESTED,
    GENERATION_EVENTS.IMAGE_GENERATED,
    GENERATION_EVENTS.IMAGE_RETRYING,
    GENERATION_EVENTS.IMAGE_FAILED,
  ],
} as const;
```

Create `src/lib/events/generation/GenerationEventPayloadMap.ts`:

```ts
import { GENERATION_EVENTS, type GenerationEventType } from './GenerationEventRegistry';
import type {
  GenerationFailurePayload,
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageGenerationRetryPayload,
  ScrambleGenerationConfig,
  ScrambleGenerationResult,
} from './GenerationEventTypes';

export interface GenerationEventPayloadMap extends Record<GenerationEventType, object> {
  [GENERATION_EVENTS.SCRAMBLE_REQUESTED]: {
    scopeId: string;
    config: ScrambleGenerationConfig;
  };
  [GENERATION_EVENTS.SCRAMBLE_GENERATED]: ScrambleGenerationResult;
  [GENERATION_EVENTS.SCRAMBLE_FAILED]: GenerationFailurePayload;
  [GENERATION_EVENTS.IMAGE_REQUESTED]: {
    scopeId: string;
    config: ImageGenerationConfig;
  };
  [GENERATION_EVENTS.IMAGE_GENERATED]: ImageGenerationResult;
  [GENERATION_EVENTS.IMAGE_RETRYING]: ImageGenerationRetryPayload;
  [GENERATION_EVENTS.IMAGE_FAILED]: GenerationFailurePayload;
}
```

Create `src/lib/events/generation/GenerationEvent.ts`:

```ts
import type { GenerationEventPayloadMap } from './GenerationEventPayloadMap';
import type { GenerationEventType } from './GenerationEventRegistry';

export type GenerationEvent<K extends GenerationEventType = GenerationEventType> =
  K extends GenerationEventType ? {
    id: string;
    type: K;
    timestamp: number;
    payload: GenerationEventPayloadMap[K];
  } : never;
```

Create `src/lib/events/generation/index.ts`:

```ts
export * from './GenerationEvent';
export * from './GenerationEventPayloadMap';
export * from './GenerationEventRegistry';
export * from './GenerationEventTypes';
```

Modify timer event files so the current application bus can carry generation events:

```ts
// TimerEventRegistry.ts
import { GENERATION_EVENTS, type GenerationEventType } from '$lib/events/generation/GenerationEventRegistry';

export const TIMER_EVENTS = {
  // existing timer entries...
  ...GENERATION_EVENTS,
} as const;

export type TimerEventType = (typeof TIMER_EVENTS)[keyof typeof TIMER_EVENTS] | GenerationEventType;
```

```ts
// TimerEventPayloadMap.ts
import type { GenerationEventPayloadMap } from '$lib/events/generation/GenerationEventPayloadMap';

export interface TimerEventPayloadMap
  extends Record<TimerEventType, object>,
    GenerationEventPayloadMap {
  // existing timer entries...
}
```

- [ ] **Step 4: Run the contract test**

Run: `npx vitest run src/lib/events/generation/GenerationEventTypes.test-d.ts src/lib/events/timer/TimerEventTypes.test-d.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/generation src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/timer/TimerEvent.ts src/lib/events/timer/TimerEventFactory.ts
git -c commit.gpgsign=false commit -m "feat: add scoped generation event contracts"
```

## Task 2: Scope-Bound Generation Client

**Files:**
- Create: `src/lib/events/generation/GenerationClient.ts`
- Create: `src/lib/events/generation/GenerationClient.test.ts`
- Modify: `src/lib/events/generation/index.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.test.ts`

**Interfaces:**
- Consumes: `EventBus<TimerEvent>`, `TimerEventFactory`, `GENERATION_EVENTS`, and generation payload types from Task 1.
- Produces: `GenerationClient`, `createGenerationClient(bus, events, scopeId)`, `GenerationClient.destroy()`, `generation.scrambles.request`, `generation.images.request`, request-specific subscriptions, scope-level subscriptions.

- [ ] **Step 1: Write failing client tests**

Create `src/lib/events/generation/GenerationClient.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import { createGenerationClient } from './GenerationClient';

function harness() {
  let id = 0;
  let now = 100;
  const events = new TimerEventFactory({ now: () => now += 10 }, { next: () => `id-${++id}` });
  const bus = new EventBus<TimerEvent>();
  const client = createGenerationClient(bus, events, 'timer:1');
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, client, observed };
}

describe('GenerationClient', () => {
  it('publishes scramble requests with the bound scope and native timestamp', async () => {
    const { client, observed } = harness();

    const requestId = await client.scrambles.request(
      { mode: '333', count: 1, length: 0, probability: -1 },
      { sourceEvent: { timeStamp: 321.5 } },
    );

    expect(requestId).toBe('id-1');
    expect(observed.at(-1)).toMatchObject({
      id: requestId,
      type: GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 321.5,
      payload: {
        scopeId: 'timer:1',
        config: { mode: '333', count: 1, length: 0, probability: -1 },
      },
    });
  });

  it('filters generated events by scope and request id', async () => {
    const { bus, events, client } = harness();
    const generated = vi.fn();
    const requestId = await client.scrambles.request({ mode: '333' });
    client.scrambles.onGenerated(requestId, generated);

    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:2',
      requestId,
      scrambles: ['wrong-scope'],
    }));
    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:1',
      requestId: 'different-request',
      scrambles: ['wrong-request'],
    }));
    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:1',
      requestId,
      scrambles: ['R U R'],
    }));

    expect(generated).toHaveBeenCalledTimes(1);
    expect(generated).toHaveBeenCalledWith({
      scopeId: 'timer:1',
      requestId,
      scrambles: ['R U R'],
    });
  });

  it('tears down subscriptions created by the client', async () => {
    const { bus, events, client } = harness();
    const generated = vi.fn();
    client.images.onGenerated(generated);
    client.destroy();

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_GENERATED, {
      scopeId: 'timer:1',
      requestId: 'image-1',
      images: ['svg'],
    }));

    expect(generated).not.toHaveBeenCalled();
  });

  it('publishes image requests with CubeMode and CubeView separated', async () => {
    const { client, observed } = harness();

    await client.images.request({
      scramble: "R U R'",
      puzzle: 'rubik',
      mode: CubeMode.OLL,
      view: 'bird',
      order: [3, 3, 3],
    });

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_REQUESTED,
      payload: {
        scopeId: 'timer:1',
        config: {
          scramble: "R U R'",
          puzzle: 'rubik',
          mode: CubeMode.OLL,
          view: 'bird',
          order: [3, 3, 3],
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run the client tests and verify they fail**

Run: `npx vitest run src/lib/events/generation/GenerationClient.test.ts`

Expected: FAIL because `GenerationClient.ts` does not exist.

- [ ] **Step 3: Implement the client**

Create `src/lib/events/generation/GenerationClient.ts`:

```ts
import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { NativeTimestampSource, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { GENERATION_EVENTS } from './GenerationEventRegistry';
import type {
  GenerationFailurePayload,
  ImageGenerationConfig,
  ImageGenerationResult,
  ScrambleGenerationConfig,
  ScrambleGenerationResult,
} from './GenerationEventTypes';

export interface GenerationRequestOptions {
  sourceEvent?: NativeTimestampSource;
}

type Detach = () => void;
type Handler<T> = (payload: T) => void;

export interface GenerationClient {
  readonly scopeId: string;
  readonly scrambles: {
    request(config: ScrambleGenerationConfig, options?: GenerationRequestOptions): Promise<string>;
    onGenerated(handler: Handler<ScrambleGenerationResult>): Detach;
    onGenerated(requestId: string, handler: Handler<ScrambleGenerationResult>): Detach;
    onFailed(handler: Handler<GenerationFailurePayload>): Detach;
    onFailed(requestId: string, handler: Handler<GenerationFailurePayload>): Detach;
  };
  readonly images: {
    request(config: ImageGenerationConfig, options?: GenerationRequestOptions): Promise<string>;
    onGenerated(handler: Handler<ImageGenerationResult>): Detach;
    onGenerated(requestId: string, handler: Handler<ImageGenerationResult>): Detach;
    onFailed(handler: Handler<GenerationFailurePayload>): Detach;
    onFailed(requestId: string, handler: Handler<GenerationFailurePayload>): Detach;
  };
  destroy(): void;
}

export function createGenerationClient(
  bus: IEventBus<TimerEvent>,
  events: TimerEventFactory,
  scopeId: string,
): GenerationClient {
  const subscriptions: EventSubscription[] = [];

  function track(subscription: EventSubscription): Detach {
    subscriptions.push(subscription);
    return () => subscription.unsubscribe();
  }

  function publish<K extends TimerEvent['type']>(
    type: K,
    payload: Extract<TimerEvent, { type: K }>['payload'],
    options?: GenerationRequestOptions,
  ): Promise<string> {
    const event = options?.sourceEvent
      ? events.fromNative(type, payload, options.sourceEvent)
      : events.create(type, payload);
    return bus.publish(event).then(() => event.id);
  }

  function subscribe<TPayload extends { scopeId: string; requestId: string }>(
    type: TimerEvent['type'],
    handlerId: string,
    maybeRequestIdOrHandler: string | Handler<TPayload>,
    maybeHandler?: Handler<TPayload>,
  ): Detach {
    const requestId = typeof maybeRequestIdOrHandler === 'string' ? maybeRequestIdOrHandler : null;
    const handler = (typeof maybeRequestIdOrHandler === 'string'
      ? maybeHandler
      : maybeRequestIdOrHandler) as Handler<TPayload>;
    return track(bus.subscribe(type, handlerId, event => {
      const payload = event.payload as TPayload;
      if (payload.scopeId !== scopeId) return;
      if (requestId !== null && payload.requestId !== requestId) return;
      handler(payload);
    }));
  }

  return {
    scopeId,
    scrambles: {
      request(config, options) {
        return publish(GENERATION_EVENTS.SCRAMBLE_REQUESTED, { scopeId, config }, options);
      },
      onGenerated(requestIdOrHandler, maybeHandler?) {
        return subscribe(
          GENERATION_EVENTS.SCRAMBLE_GENERATED,
          `${scopeId}:generation-client:scramble-generated`,
          requestIdOrHandler,
          maybeHandler,
        );
      },
      onFailed(requestIdOrHandler, maybeHandler?) {
        return subscribe(
          GENERATION_EVENTS.SCRAMBLE_FAILED,
          `${scopeId}:generation-client:scramble-failed`,
          requestIdOrHandler,
          maybeHandler,
        );
      },
    },
    images: {
      request(config, options) {
        return publish(GENERATION_EVENTS.IMAGE_REQUESTED, { scopeId, config }, options);
      },
      onGenerated(requestIdOrHandler, maybeHandler?) {
        return subscribe(
          GENERATION_EVENTS.IMAGE_GENERATED,
          `${scopeId}:generation-client:image-generated`,
          requestIdOrHandler,
          maybeHandler,
        );
      },
      onFailed(requestIdOrHandler, maybeHandler?) {
        return subscribe(
          GENERATION_EVENTS.IMAGE_FAILED,
          `${scopeId}:generation-client:image-failed`,
          requestIdOrHandler,
          maybeHandler,
        );
      },
    },
    destroy() {
      for (const subscription of subscriptions.splice(0)) subscription.unsubscribe();
    },
  };
}
```

Export it from `src/lib/events/generation/index.ts`.

- [ ] **Step 4: Expose clients from the runtime**

Modify `src/lib/timer/TimerApplicationRuntime.ts`:

```ts
import { createGenerationClient, type GenerationClient } from '$lib/events/generation';

export interface TimerApplicationRuntime {
  // existing fields
  createGenerationClient(scopeId: string): GenerationClient;
}

return {
  // existing fields
  createGenerationClient(scopeId: string) {
    return createGenerationClient(bus, events, scopeId);
  },
  async destroy() {
    // existing cleanup
  },
};
```

Update `src/lib/timer/TimerApplicationRuntime.test.ts` with:

```ts
it('creates scope-bound generation clients', () => {
  const runtime = createTimerApplicationRuntime({ eventLogSink: null });
  const client = runtime.createGenerationClient('timer:1');

  expect(client.scopeId).toBe('timer:1');
  client.destroy();
  void runtime.destroy();
});
```

- [ ] **Step 5: Run client and runtime tests**

Run: `npx vitest run src/lib/events/generation/GenerationClient.test.ts src/lib/timer/TimerApplicationRuntime.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/events/generation src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts
git -c commit.gpgsign=false commit -m "feat: add scope-bound generation client"
```

## Task 3: Migrate Scramble Service to Generic Events

**Files:**
- Modify: `src/lib/timer/scramble/ScrambleService.ts`
- Modify: `src/lib/timer/scramble/ScrambleService.test.ts`
- Modify: `src/lib/timer/scramble/IScrambleGenerator.ts`
- Modify: `src/lib/timer/scramble/index.ts`

**Interfaces:**
- Consumes: `generation.scramble.requested` with `{ scopeId, config }`.
- Produces: `generation.scramble.generated` with `{ scopeId, requestId, scrambles }` and `generation.scramble.failed` with `{ scopeId, requestId, errors }`.

- [ ] **Step 1: Rewrite scramble service tests around generic events**

Modify `src/lib/timer/scramble/ScrambleService.test.ts` so the core success test publishes generic requests:

```ts
import { GENERATION_EVENTS } from '$lib/events/generation';

it('generates scramble arrays for generic scoped requests', async () => {
  const { bus, events, observed } = createHarness([{
    id: 'test-generator',
    supports: mode => mode === '333',
    generate: () => "R U R'",
  }]);

  const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
    scopeId: 'timer:1',
    config: { mode: '333', count: 1, length: 0, probability: -1 },
  });
  await bus.publish(request);

  expect(observed.at(-1)).toMatchObject({
    type: GENERATION_EVENTS.SCRAMBLE_GENERATED,
    payload: {
      scopeId: 'timer:1',
      requestId: request.id,
      scrambles: ["R U R'"],
    },
  });
});

it('normalizes provided scrambles without calling a generator', async () => {
  const generator = {
    id: 'unused',
    supports: () => true,
    generate: vi.fn(),
  };
  const { bus, events, observed } = createHarness([generator], (scramble) => `normalized:${scramble}`);

  const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
    scopeId: 'tool:batch',
    config: { mode: '333', count: 1, providedScramble: 'R U' },
  });
  await bus.publish(request);

  expect(generator.generate).not.toHaveBeenCalled();
  expect(observed.at(-1)?.payload).toMatchObject({
    scopeId: 'tool:batch',
    requestId: request.id,
    scrambles: ['normalized:R U'],
  });
});
```

Keep existing unsupported-mode, generator-error, concurrent-request, and destroy tests, but update event names and result field `scramble` to `scrambles`.

- [ ] **Step 2: Run scramble tests and verify they fail**

Run: `npx vitest run src/lib/timer/scramble/ScrambleService.test.ts`

Expected: FAIL because `ScrambleService` still subscribes to `timer.scramble.requested`.

- [ ] **Step 3: Implement generic scramble handling**

Modify `src/lib/timer/scramble/ScrambleService.ts`:

```ts
import { GENERATION_EVENTS } from '$lib/events/generation';

this.subscription = bus.subscribe(
  GENERATION_EVENTS.SCRAMBLE_REQUESTED,
  'scramble-service:generate',
  event => { void this.generate(event); },
);
```

Inside `generate`, replace owner-specific payload fields with generic fields:

```ts
const { scopeId, config } = event.payload;
const count = config.count ?? 1;
const length = config.length ?? 0;
const probability = config.probability ?? -1;
const generatorRequest = { mode: config.mode, length, probability };

if (config.providedScramble !== undefined) {
  const scramble = this.normalize(config.providedScramble, config.mode);
  await this.bus.publish(this.events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
    scopeId,
    requestId: event.id,
    scrambles: [scramble],
  }));
  return;
}

const scrambles: string[] = [];
for (let index = 0; index < count; index += 1) {
  const generated = await generator.generate(generatorRequest);
  if (!generated) throw new Error('Generator returned no scramble');
  scrambles.push(this.normalize(generated, config.mode));
}
```

On failure, publish:

```ts
await this.bus.publish(this.events.create(GENERATION_EVENTS.SCRAMBLE_FAILED, {
  scopeId,
  requestId: event.id,
  errors: errors.map(entry => entry.error),
}));
```

- [ ] **Step 4: Run scramble tests**

Run: `npx vitest run src/lib/timer/scramble/ScrambleService.test.ts src/lib/timer/scramble/CSTimerScrambleGenerator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timer/scramble/ScrambleService.ts src/lib/timer/scramble/ScrambleService.test.ts src/lib/timer/scramble/IScrambleGenerator.ts src/lib/timer/scramble/index.ts
git -c commit.gpgsign=false commit -m "feat: process generic scramble generation events"
```

## Task 4: Connect Timer Scrambles Through Generation Client

**Files:**
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/handlers/registerScrambleHandlers.ts`
- Modify: `src/lib/timer/handlers/registerScrambleHandlers.test.ts`
- Modify: `src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts`
- Modify: `src/lib/timer/Timer.svelte`

**Interfaces:**
- Consumes: `application.createGenerationClient(ownerId)` and generic scramble result arrays.
- Produces: `TimerRuntime.generation`, `TimerRuntime.requestScramble(input, nativeEvent?)`, and state projection from accepted latest request only.

- [ ] **Step 1: Update projection tests to expect generic events**

Modify `src/lib/timer/handlers/registerScrambleHandlers.test.ts`:

```ts
import { GENERATION_EVENTS } from '$lib/events/generation';

it('records requested scramble config and accepts only latest generated result for its scope', async () => {
  const { bus, events, state } = createHarness('timer:1');
  const first = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
    scopeId: 'timer:1',
    config: { mode: '333', length: 0, probability: -1, source: 'user-requested' },
  });
  const second = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
    scopeId: 'timer:1',
    config: { mode: '222', length: 0, probability: -1, source: 'user-requested' },
  });

  await bus.publish(first);
  await bus.publish(second);
  await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
    scopeId: 'timer:1',
    requestId: first.id,
    scrambles: ['stale'],
  }));
  await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
    scopeId: 'timer:1',
    requestId: second.id,
    scrambles: ['accepted'],
  }));

  expect(state.scrambleRequestId).toBe(second.id);
  expect(state.scrambleMode).toBe('222');
  expect(state.scramble).toBe('accepted');
});
```

- [ ] **Step 2: Run projection tests and verify they fail**

Run: `npx vitest run src/lib/timer/handlers/registerScrambleHandlers.test.ts`

Expected: FAIL because the projection still reads `ownerId` and `scramble`.

- [ ] **Step 3: Update timer runtime request path**

Modify `src/lib/timer/TimerCompositionRoot.svelte.ts`:

```ts
import type { GenerationClient } from '$lib/events/generation';

export interface TimerRuntime {
  readonly generation: GenerationClient;
  requestScramble(input: ScrambleRequestInput, nativeEvent?: NativeTimestampSource): Promise<string>;
}

const generation = application.createGenerationClient(ownerId);
const scrambleSubscription = registerScrambleHandlers(generation, state);

async function publishScrambleRequest(
  input: ScrambleRequestInput,
  nativeEvent?: NativeTimestampSource,
): Promise<string> {
  return generation.scrambles.request({
    mode: input.mode,
    count: 1,
    length: input.length,
    probability: input.probability,
    providedScramble: input.providedScramble,
    source: input.source,
  }, nativeEvent ? { sourceEvent: nativeEvent } : undefined);
}
```

On runtime destroy, call `generation.destroy()` after projection subscriptions are removed.

- [ ] **Step 4: Update scramble projection to use the client**

Modify `src/lib/timer/handlers/registerScrambleHandlers.ts`:

```ts
import type { EventSubscription } from '$lib/events/EventBus';
import type { GenerationClient } from '$lib/events/generation';
import type { TimerState } from '../TimerState.svelte';

export function registerScrambleHandlers(
  generation: GenerationClient,
  state: TimerState,
): EventSubscription {
  const detachGenerated = generation.scrambles.onGenerated(result => {
    if (result.requestId !== state.scrambleRequestId) return;
    state.scramble = result.scrambles[0] ?? '';
  });

  return {
    unsubscribe() {
      detachGenerated();
    },
  };
}
```

The request-state projection can live inside `TimerRuntime.requestScramble` immediately after the request ID is returned:

```ts
const requestId = await generation.scrambles.request(config, options);
state.scrambleRequestId = requestId;
state.scrambleMode = config.mode;
state.scrambleLength = config.length ?? 0;
state.scrambleProbability = config.probability ?? -1;
return requestId;
```

- [ ] **Step 5: Update lifecycle tests to observe generic requests**

Modify `src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts` so observers listen for `GENERATION_EVENTS.SCRAMBLE_REQUESTED` and assert `payload.scopeId === ownerId`, `payload.config.source`, and `event.id` as the request ID.

- [ ] **Step 6: Run timer scramble tests**

Run: `npx vitest run src/lib/timer/handlers/registerScrambleHandlers.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleUiBridge.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit and stop for user validation**

```bash
git add src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/handlers/registerScrambleHandlers.ts src/lib/timer/handlers/registerScrambleHandlers.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts src/lib/timer/Timer.svelte
git -c commit.gpgsign=false commit -m "feat: route timer scrambles through generation client"
```

Manual checkpoint for user testing:

- Initial scramble appears on `/timer/1`.
- Refresh and edit scramble still work.
- Solve completion requests the next scramble.
- Running cancellation respects `scrambleAfterCancel`.
- Event debugger shows `generation.scramble.requested` and `generation.scramble.generated` with `scopeId: "timer:1"`.
- No timer-specific generation event publication remains in timer UI code.

## Task 5: Generic Image Generation Service

**Files:**
- Create: `src/lib/timer/scramble/ImageGenerationService.ts`
- Create: `src/lib/timer/scramble/ImageGenerationService.test.ts`
- Create: `src/lib/timer/scramble/IImageGenerator.ts`
- Modify: `src/lib/timer/scramble/IScramblePreviewGenerator.ts`
- Modify: `src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.ts`
- Modify: `src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.test.ts`
- Modify: `src/lib/timer/scramble/index.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.test.ts`

**Interfaces:**
- Consumes: `generation.image.requested` with `{ scopeId, config }`.
- Produces: `generation.image.generated`, `generation.image.retrying`, and `generation.image.failed`.
- Adapter API: `IImageGenerator.supports(config)`, `IImageGenerator.generate(config): Promise<string[]>`.

- [ ] **Step 1: Write failing image service tests**

Create `src/lib/timer/scramble/ImageGenerationService.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import { EventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS, type ImageGenerationConfig } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { ImageGenerationService, IMAGE_GENERATION_MAX_ATTEMPTS } from './ImageGenerationService';
import type { IImageGenerator } from './IImageGenerator';

const config: ImageGenerationConfig = {
  scramble: "R U R'",
  puzzle: 'rubik',
  mode: CubeMode.OLL,
  view: 'bird',
  order: [3, 3, 3],
};

function harness(generator: IImageGenerator) {
  let id = 0;
  const events = new TimerEventFactory({ now: () => 100 }, { next: () => `id-${++id}` });
  const bus = new EventBus<TimerEvent>();
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new ImageGenerationService(bus, events, generator);
  return { bus, events, observed, service };
}

describe('ImageGenerationService', () => {
  it('publishes generated images for supported configs', async () => {
    const { bus, events, observed } = harness({
      supports: () => true,
      generate: vi.fn().mockResolvedValue(['svg']),
    });

    const request = events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'timer:1',
      config,
    });
    await bus.publish(request);

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_GENERATED,
      payload: { scopeId: 'timer:1', requestId: request.id, images: ['svg'] },
    });
  });

  it('publishes retry diagnostics and final failure after exactly three attempts', async () => {
    const error = new Error('draw failed');
    const generator = {
      supports: () => true,
      generate: vi.fn().mockRejectedValue(error),
    };
    const { bus, events, observed } = harness(generator);

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'timer:1',
      config,
    }));

    expect(generator.generate).toHaveBeenCalledTimes(IMAGE_GENERATION_MAX_ATTEMPTS);
    expect(observed.filter(event => event.type === GENERATION_EVENTS.IMAGE_RETRYING)).toHaveLength(2);
    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_FAILED,
      payload: {
        scopeId: 'timer:1',
        errors: [{ name: 'Error', message: 'draw failed' }],
      },
    });
  });

  it('keeps CubeMode and CubeView in the adapter config', async () => {
    const generate = vi.fn().mockResolvedValue(['svg']);
    const { bus, events } = harness({ supports: () => true, generate });

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'algorithm:oll',
      config: { ...config, mode: CubeMode.PLL, view: 'plan' },
    }));

    expect(generate).toHaveBeenCalledWith({ ...config, mode: CubeMode.PLL, view: 'plan' });
  });
});
```

- [ ] **Step 2: Run image service tests and verify they fail**

Run: `npx vitest run src/lib/timer/scramble/ImageGenerationService.test.ts`

Expected: FAIL because the service and adapter interface do not exist.

- [ ] **Step 3: Implement `IImageGenerator` and service**

Create `src/lib/timer/scramble/IImageGenerator.ts`:

```ts
import type { ImageGenerationConfig } from '$lib/events/generation';

export interface IImageGenerator {
  supports(config: ImageGenerationConfig): boolean;
  generate(config: ImageGenerationConfig): Promise<string[]>;
}
```

Create `src/lib/timer/scramble/ImageGenerationService.ts`:

```ts
import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS, type GenerationError } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IImageGenerator } from './IImageGenerator';

export const IMAGE_GENERATION_MAX_ATTEMPTS = 3;

function normalizeError(error: unknown): GenerationError {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

export class ImageGenerationService {
  private readonly subscription: EventSubscription;
  private destroyed = false;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly generator: IImageGenerator,
  ) {
    this.subscription = bus.subscribe(
      GENERATION_EVENTS.IMAGE_REQUESTED,
      'image-generation-service:generate',
      event => { void this.generate(event); },
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.subscription.unsubscribe();
  }

  private async generate(event: Extract<TimerEvent, { type: typeof GENERATION_EVENTS.IMAGE_REQUESTED }>) {
    const { scopeId, config } = event.payload;
    if (!this.generator.supports(config)) {
      await this.publishFailure(scopeId, event.id, {
        name: 'UnsupportedImageGenerationConfig',
        message: `Image generator does not support mode "${config.mode}" and view "${config.view}"`,
      });
      return;
    }

    let lastError: GenerationError = { name: 'Error', message: 'Image generation failed' };
    for (let attempt = 1; attempt <= IMAGE_GENERATION_MAX_ATTEMPTS; attempt += 1) {
      try {
        const images = await this.generator.generate(config);
        if (this.destroyed) return;
        await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_GENERATED, {
          scopeId,
          requestId: event.id,
          images,
        }));
        return;
      } catch (error) {
        lastError = normalizeError(error);
        if (this.destroyed) return;
        if (attempt < IMAGE_GENERATION_MAX_ATTEMPTS) {
          await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_RETRYING, {
            scopeId,
            requestId: event.id,
            attempt,
            error: lastError,
          }));
        }
      }
    }

    await this.publishFailure(scopeId, event.id, lastError);
  }

  private async publishFailure(scopeId: string, requestId: string, error: GenerationError) {
    if (this.destroyed) return;
    await this.bus.publish(this.events.create(GENERATION_EVENTS.IMAGE_FAILED, {
      scopeId,
      requestId,
      errors: [error],
    }));
  }
}
```

- [ ] **Step 4: Adapt cube-bundle rendering to the new image config**

Modify `src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.ts`:

```ts
import type { Puzzle } from '@classes/puzzle/puzzle';
import { pScramble } from '@cstimer/scramble';
import { pGenerateCubeBundle } from '@helpers/cube-draw';
import { scrambleToPuzzle } from '@helpers/scrambleToPuzzle';
import type { ImageGenerationConfig } from '$lib/events/generation';
import type { IImageGenerator } from './IImageGenerator';

export class CubeBundleScramblePreviewGenerator implements IImageGenerator {
  supports(config: ImageGenerationConfig): boolean {
    return this.dependencies.supports(config.configMode ?? config.mode);
  }

  async generate(config: ImageGenerationConfig): Promise<string[]> {
    const cubes = this.dependencies.toPuzzle(config.scramble, config.mode);
    for (const cube of cubes) cube.view = config.view;
    return this.dependencies.draw(cubes, 500, false, false, false);
  }
}
```

If `CubeMode` values are not accepted by `scrambleToPuzzle(mode: string)`, add an adapter helper:

```ts
function toScrambleMode(config: ImageGenerationConfig): string {
  return typeof config.mode === 'string' ? config.mode : String(config.mode);
}
```

Update tests so `view: 'plan'` and `view: 'bird'` are assigned on every generated puzzle before draw.

- [ ] **Step 5: Compose image service in application runtime**

Modify `src/lib/timer/TimerApplicationRuntime.ts`:

```ts
import { CubeBundleScramblePreviewGenerator } from './scramble/CubeBundleScramblePreviewGenerator';
import { ImageGenerationService } from './scramble/ImageGenerationService';
import type { IImageGenerator } from './scramble/IImageGenerator';

export interface TimerApplicationRuntimeOptions {
  imageGenerator?: IImageGenerator;
}

export interface TimerApplicationRuntime {
  readonly imageGenerationService: ImageGenerationService;
}

const imageGenerationService = new ImageGenerationService(
  bus,
  events,
  options.imageGenerator ?? new CubeBundleScramblePreviewGenerator(),
);
```

Destroy it in `runtime.destroy()`:

```ts
imageGenerationService.destroy();
```

- [ ] **Step 6: Run image tests**

Run: `npx vitest run src/lib/timer/scramble/ImageGenerationService.test.ts src/lib/timer/scramble/CubeBundleScramblePreviewGenerator.test.ts src/lib/timer/TimerApplicationRuntime.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/timer/scramble src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts
git -c commit.gpgsign=false commit -m "feat: add generic image generation service"
```

## Task 6: Connect Timer Preview Images Through Generation Client

**Files:**
- Modify: `src/lib/timer/TimerState.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Modify: `src/lib/timer/ScrambleUiBridge.test.ts`
- Modify: `src/lib/components/EventDebugPanel.svelte`

**Interfaces:**
- Consumes: accepted scramble state and `generation.images.request(config)`.
- Produces: timer preview state independent from scramble state, with stale image result rejection.

- [ ] **Step 1: Add timer image projection tests**

Add to `src/lib/timer/TimerCompositionRoot.test.ts`:

```ts
it('requests an image after accepting the latest scramble when preview is enabled', async () => {
  const runtime = createTimerRuntime({
    application: createTimerApplicationRuntime({ eventLogSink: null }),
    ownerId: 'timer:1',
    flags: { scramble: true },
  });
  runtime.state.session = {
    _id: 's1',
    name: 'Session',
    settings: {
      hasInspection: true,
      inspection: 15,
      showElapsedTime: true,
      calcAoX: 0,
      genImage: true,
      scrambleAfterCancel: false,
      withoutPrevention: false,
    },
  };

  const imageRequests: TimerEvent[] = [];
  runtime.bus.subscribe(GENERATION_EVENTS.IMAGE_REQUESTED, 'test:image-request', event => {
    imageRequests.push(event);
  });

  await runtime.requestScramble({ mode: '333', length: 0, probability: -1, source: 'user-requested' });

  expect(imageRequests).toHaveLength(1);
  expect(imageRequests[0].payload.scopeId).toBe('timer:1');
  expect(imageRequests[0].payload.config).toMatchObject({
    scramble: runtime.state.scramble,
    view: 'trans',
  });
});
```

- [ ] **Step 2: Run timer image integration test and verify it fails**

Run: `npx vitest run src/lib/timer/TimerCompositionRoot.test.ts`

Expected: FAIL because accepted scrambles do not request images yet.

- [ ] **Step 3: Add preview state**

Modify `src/lib/timer/TimerState.svelte.ts`:

```ts
scramblePreview: string[] = $state([]);
scramblePreviewRequestId: string | null = $state(null);
scramblePreviewEnabled: boolean = $state(false);
```

- [ ] **Step 4: Request images after accepted scrambles**

In the timer runtime, after `state.scramble` is set from an accepted generated result, request images only when `state.session?.settings.genImage === true`:

```ts
const imageRequestId = await generation.images.request({
  scramble: state.scramble,
  puzzle: 'rubik',
  mode: CubeMode.NORMAL,
  view: 'trans',
  order: [3, 3, 3],
});
state.scramblePreviewRequestId = imageRequestId;
```

Use existing session/mode helpers if a current mode can be resolved without importing UI-only data. If mode/view cannot yet be resolved from timer state, use the temporary compatibility defaults from the approved spec: `mode: CubeMode.NORMAL`, `view: 'trans'`, and record a follow-up item in the checkpoint notes to wire UI-selected render settings.

Subscribe to generated images:

```ts
const detachImageGenerated = generation.images.onGenerated(result => {
  if (result.requestId !== state.scramblePreviewRequestId) return;
  state.scramblePreview = result.images;
});
```

Subscribe to failures without clearing the current scramble:

```ts
const detachImageFailed = generation.images.onFailed(result => {
  if (result.requestId !== state.scramblePreviewRequestId) return;
  state.scramblePreview = [];
});
```

- [ ] **Step 5: Mirror preview images into the legacy display store**

Modify `src/lib/timer/Timer.svelte`:

```ts
$effect(() => {
  if (!eventTimerRuntime.flags.scramble) return;
  timerController.preview.set(
    eventTimerRuntime.state.scramblePreview.map(src => ({ src, alt: '', title: '' })),
  );
});
```

- [ ] **Step 6: Add debugger categories for generation events**

Modify `src/lib/components/EventDebugPanel.svelte` so event icons/categories include:

```ts
if (event.type.startsWith('generation.scramble.')) return { icon: ShuffleIcon, label: 'Scramble' };
if (event.type.startsWith('generation.image.')) return { icon: ImageIcon, label: 'Image' };
```

Use existing icon import style in the file.

- [ ] **Step 7: Run focused timer image tests**

Run: `npx vitest run src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleUiBridge.test.ts src/lib/timer/scramble/ImageGenerationService.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit and stop for user validation**

```bash
git add src/lib/timer/TimerState.svelte.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/Timer.svelte src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleUiBridge.test.ts src/lib/components/EventDebugPanel.svelte
git -c commit.gpgsign=false commit -m "feat: route timer preview images through generation client"
```

Manual checkpoint for user testing:

- Scramble text appears immediately and does not wait for image generation.
- Preview image appears when `genImage` is enabled.
- Failed preview generation logs retry/failure events but keeps the valid scramble.
- Event debugger shows `generation.image.requested`, retry/failure or generated events with `scopeId` and `requestId`.
- Rapid scramble refresh does not display an older image over a newer scramble.

## Task 7: Remove Superseded Timer-Specific Generation Contracts

**Files:**
- Modify: `src/lib/events/timer/TimerEventRegistry.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/ScrambleEventTypes.ts`
- Modify: `src/lib/events/timer/TimerEventFactory.test.ts`
- Modify: `src/lib/timer/scramble/ScramblePreviewService.ts`
- Modify: `src/lib/timer/scramble/ScramblePreviewService.test.ts`
- Modify: `src/lib/timer/scramble/index.ts`
- Modify: `src/lib/components/EventDebugPanel.svelte`

**Interfaces:**
- Consumes: user acceptance from Task 4 and Task 6.
- Produces: no production references to `timer.scramble.*` or `timer.scramble-preview.*`; only generic `generation.*` contracts remain for generation.

- [ ] **Step 1: Search for remaining timer-specific generation events**

Run: `rg -n "SCRAMBLE_REQUESTED|SCRAMBLE_GENERATED|SCRAMBLE_GENERATION_FAILED|SCRAMBLE_PREVIEW|timer\\.scramble" src docs`

Expected: only historical docs/plans and removable compatibility tests reference these names.

- [ ] **Step 2: Remove timer-specific generation event names and payload entries**

Delete these keys from `TIMER_EVENTS`:

```ts
SCRAMBLE_REQUESTED
SCRAMBLE_GENERATED
SCRAMBLE_GENERATION_FAILED
SCRAMBLE_PREVIEW_REQUESTED
SCRAMBLE_PREVIEW_GENERATED
SCRAMBLE_PREVIEW_GENERATION_FAILED
SCRAMBLE_PREVIEW_CLEARED
```

Delete matching entries from `TimerEventPayloadMap`.

- [ ] **Step 3: Remove obsolete preview service files**

Delete or stop exporting:

```text
src/lib/timer/scramble/ScramblePreviewService.ts
src/lib/timer/scramble/ScramblePreviewService.test.ts
src/lib/timer/scramble/IScramblePreviewGenerator.ts
```

Keep `CubeBundleScramblePreviewGenerator.ts` only as the concrete `IImageGenerator` adapter.

- [ ] **Step 4: Run cleanup verification**

Run: `npx vitest run src/lib/events/generation/GenerationEventTypes.test-d.ts src/lib/events/generation/GenerationClient.test.ts src/lib/timer/scramble/ScrambleService.test.ts src/lib/timer/scramble/ImageGenerationService.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/ScrambleLifecycleTriggers.integration.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: PASS. If lint fails, fix only files changed in this plan.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events src/lib/timer src/lib/components/EventDebugPanel.svelte
git -c commit.gpgsign=false commit -m "refactor: remove timer-specific generation events"
```

## Self-Review

Spec coverage:

- Scope-bound client: Task 2.
- Timer scope ID exactly equals timer ID: Tasks 2 and 4.
- Scramble and image contracts separated: Tasks 1, 3, and 5.
- `CubeMode` and `CubeView` separated in image config: Tasks 1, 2, 5, and 6.
- Request IDs and scope IDs on all results/failures: Tasks 1 through 5.
- Native/programmatic timestamp rules: Task 2.
- Single and batch arrays: Tasks 1 and 3.
- Image retry policy: Task 5.
- Timer latest-result display policy: Tasks 4 and 6.
- Debugger visibility: Task 6.
- Reversible commit groups and manual checkpoints: Tasks 4 and 6.

Placeholder scan:

- No forbidden placeholder tokens or vague test instructions remain.
- The only conditional instruction is the approved temporary compatibility default for image mode/view in Task 6, with explicit code and checkpoint notes.

Type consistency:

- `GenerationClient`, `createGenerationClient`, `GENERATION_EVENTS`, `ScrambleGenerationConfig`, `ImageGenerationConfig`, `ScrambleGenerationResult`, and `ImageGenerationResult` names are introduced before later tasks use them.
- Result handlers consistently receive payload objects, not event envelopes.
- Timer runtime continues exposing `requestScramble(input, nativeEvent?)` so UI migration stays reversible.
