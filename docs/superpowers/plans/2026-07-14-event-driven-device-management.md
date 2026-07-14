# Event-Driven Device Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an application-scoped typed EventBus, reactive device catalog, exclusive managed-device leases, and a fully event-driven keyboard path that can be tested behind a query flag before production activation.

**Architecture:** The root layout owns one `TimerApplicationRuntime` containing the bus, factory, event logger, `DeviceManager`, `DeviceCatalog`, keyboard device, and native keyboard boundary. Each timer runtime registers an owner-scoped read-only view and high-frequency callback, while its reactor ignores events for other owners. A temporary metadata-only bridge publishes unmigrated legacy devices into the catalog without claiming that their lifecycle is manager-controlled.

**Tech Stack:** TypeScript 5.9, Svelte 5 runes/context, XState 5, Vitest 4, ESLint 9, existing typed `TimerEventBus`.

## Global Constraints

- Work directly on the current branch as PR-sized commit groups.
- Stop after every group, report exact changes and automated results, provide manual test steps, and wait for user acceptance.
- Follow red-green-refactor for every behavior and include tests for every implemented part.
- Do not run a build at any step.
- Do not run `svelte-check` unless the user explicitly requests it.
- Run Vitest with one worker and `NODE_OPTIONS=--max-old-space-size=1536`.
- Every event uses `{ id, type, timestamp, payload }`.
- Native click, keyboard, pointer, or other browser input uses `event.timeStamp`; programmatic facts use the monotonic clock when the fact occurs.
- Retain canonical persisted IDs. Keyboard is `cubicdb:device:timer_keyboard`.
- Switching managed devices calls `stop()`, not `disconnect()`.
- `disconnect()` is only for explicit disconnection, physical loss, or application shutdown.
- A timer owns at most one managed lease; a managed device has at most one owner; contention is rejected without transfer or fallback.
- High-frequency readings remain a direct callback and never travel through EventBus.
- Preserve the legacy path behind migration flags until production-route acceptance.

---

## Commit Group 1: Device Bus API and Reactive Catalog

### Task 1: Freeze the typed device contract

**Files:**

- Create: `src/lib/timer/devices/TimerDeviceDescriptor.ts`
- Modify: `src/lib/timer/devices/ITimerDevice.ts`
- Modify: `src/lib/events/timer/TimerEventRegistry.ts`
- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/TimerEventTypes.test-d.ts`
- Modify: `src/lib/events/index.ts`

**Interfaces:**

- Produces: `TIMER_DEVICE_IDS`, `TimerDeviceDescriptor`, `LegacyTimerDeviceDescriptor`, `TimerDeviceOwnerBinding`, `TimerDeviceActivationContext`, `DeviceLeaseRejectionReason`, and the asynchronous-capable `ITimerDevice` lifecycle.
- Consumes: existing `TimerReadonlyView`, `TimerReadingCallback`, `TimerEventFactory`, and `TimerEventBus`.

- [ ] **Step 1: Write compile-time contract assertions**

Extend `TimerEventTypes.test-d.ts` with valid payloads for change, rejection, release, catalog sync, and catalog update, plus `@ts-expect-error` cases for a missing `ownerId`, a non-union rejection reason, and a catalog containing a lifecycle method.

```ts
factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
});

factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED, {
  ownerId: 'timer:one',
  deviceId: 'cubicdb:device:timer_keyboard',
  reason: 'already-in-use',
});

// @ts-expect-error ownerId is required.
factory.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  deviceId: 'cubicdb:device:timer_keyboard',
});
```

- [ ] **Step 2: Run the Vitest typecheck to establish the pre-implementation failure**

Run:

```powershell
pnpm test:unit --typecheck --run src/lib/events/timer/TimerEventTypes.test-d.ts
```

Expected: typecheck fails because the new constants/types do not exist or payloads do not match.

- [ ] **Step 3: Add descriptor and lifecycle types**

Create `TimerDeviceDescriptor.ts` with these exact public shapes:

```ts
import type { TimerReadonlyView } from '../TimerReadonlyView';
import type { TimerReadingCallback } from './ITimerDevice';

export const TIMER_DEVICE_IDS = {
  KEYBOARD: 'cubicdb:device:timer_keyboard',
} as const;

export type TimerDeviceConnectionStatus = 'connected' | 'disconnected' | 'error';
export type TimerDeviceActivationStatus = 'stopped' | 'starting' | 'active' | 'stopping' | 'error';
export type TimerDeviceAvailability = 'available' | 'in-use' | 'unavailable';
export type TimerDeviceManagementMode = 'managed' | 'legacy';

export interface TimerDeviceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly connectionStatus: TimerDeviceConnectionStatus;
  readonly activationStatus: TimerDeviceActivationStatus;
  readonly availability: TimerDeviceAvailability;
  readonly managementMode: TimerDeviceManagementMode;
  readonly leaseOwnerId: string | null;
  readonly capabilities: readonly string[];
}

export type LegacyTimerDeviceDescriptor = Omit<
  TimerDeviceDescriptor,
  'activationStatus' | 'availability' | 'managementMode' | 'leaseOwnerId'
>;

export interface TimerDeviceOwnerBinding {
  readonly readonlyView: TimerReadonlyView;
  readonly onReading: TimerReadingCallback;
}

export interface TimerDeviceActivationContext extends TimerDeviceOwnerBinding {
  readonly ownerId: string;
}

export type DeviceLeaseRejectionReason =
  | 'device-not-found'
  | 'already-in-use'
  | 'incompatible-device'
  | 'start-failed'
  | 'stop-failed'
  | 'owner-not-registered';
```

Change `ITimerDevice` to expose a managed descriptor and lifecycle methods that may be synchronous or asynchronous:

```ts
export type MaybePromise<T> = T | Promise<T>;

export interface ITimerDevice {
  readonly descriptor: Omit<
    TimerDeviceDescriptor,
    'activationStatus' | 'availability' | 'leaseOwnerId' | 'managementMode'
  >;
  start(context: TimerDeviceActivationContext): MaybePromise<void>;
  stop(): MaybePromise<void>;
  disconnect(): MaybePromise<void>;
  destroy(): MaybePromise<void>;
}
```

- [ ] **Step 4: Add exact event constants and payloads**

Add these constants:

```ts
ACTIVE_DEVICE_CHANGE_REJECTED: 'timer.device.active-change-rejected',
ACTIVE_DEVICE_RELEASE_REQUESTED: 'timer.device.active-release-requested',
ACTIVE_DEVICE_RELEASED: 'timer.device.active-released',
ACTIVE_DEVICE_RELEASE_REJECTED: 'timer.device.active-release-rejected',
DEVICE_DISCONNECT_REQUESTED: 'timer.device.disconnect-requested',
DEVICE_DISCONNECT_FAILED: 'timer.device.disconnect-failed',
DEVICE_CATALOG_UPDATED: 'timer.device.catalog-updated',
LEGACY_DEVICE_CATALOG_SYNC_REQUESTED: 'timer.device.legacy-catalog-sync-requested',
DEVICE_OWNER_DESTROY_REQUESTED: 'timer.device.owner-destroy-requested',
```

Use these payloads:

```ts
type OwnerDevicePayload = { ownerId: string; deviceId: string };

[TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED]: OwnerDevicePayload;
[TIMER_EVENTS.ACTIVE_DEVICE_CHANGED]: OwnerDevicePayload & { previousDeviceId: string | null };
[TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED]: OwnerDevicePayload & {
  reason: DeviceLeaseRejectionReason;
};
[TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED]: OwnerDevicePayload;
[TIMER_EVENTS.ACTIVE_DEVICE_RELEASED]: OwnerDevicePayload;
[TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REJECTED]: OwnerDevicePayload & { reason: 'stop-failed' };
[TIMER_EVENTS.DEVICE_DISCONNECT_REQUESTED]: { deviceId: string };
[TIMER_EVENTS.DEVICE_DISCONNECT_FAILED]: { deviceId: string; reason: 'disconnect-failed' };
[TIMER_EVENTS.DEVICE_CATALOG_UPDATED]: { devices: readonly TimerDeviceDescriptor[] };
[TIMER_EVENTS.LEGACY_DEVICE_CATALOG_SYNC_REQUESTED]: {
  devices: readonly LegacyTimerDeviceDescriptor[];
};
[TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED]: { ownerId: string };
```

- [ ] **Step 5: Run focused lint and existing event tests**

Run:

```powershell
pnpm exec eslint src/lib/timer/devices/TimerDeviceDescriptor.ts src/lib/timer/devices/ITimerDevice.ts src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/timer/TimerEventTypes.test-d.ts src/lib/events/index.ts
pnpm test:unit --typecheck --run src/lib/events/timer/TimerEventTypes.test-d.ts
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/events/timer --maxWorkers=1
```

Expected: ESLint exits 0 and existing event tests pass.

- [ ] **Step 6: Commit the contract**

```powershell
git add -- src/lib/timer/devices/TimerDeviceDescriptor.ts src/lib/timer/devices/ITimerDevice.ts src/lib/events/timer/TimerEventRegistry.ts src/lib/events/timer/TimerEventPayloadMap.ts src/lib/events/timer/TimerEventTypes.test-d.ts src/lib/events/index.ts
git -c commit.gpgsign=false commit -m "feat: define managed timer device contracts"
```

### Task 2: Build the immutable reactive DeviceCatalog

**Files:**

- Create: `src/lib/timer/devices/DeviceCatalog.svelte.ts`
- Create: `src/lib/timer/devices/DeviceCatalog.test.ts`

**Interfaces:**

- Consumes: `ITimerEventBus`, `DEVICE_CATALOG_UPDATED`, `TimerDeviceDescriptor`.
- Produces: `DeviceCatalog.devices`, `find(deviceId)`, and `destroy()`.

- [ ] **Step 1: Write failing projection tests**

Cover an empty initial snapshot, replacement after an event, immutable cloned descriptors/capabilities, `find`, and no updates after `destroy()`.

```ts
it('replaces the catalog from immutable event snapshots', async () => {
  const catalog = new DeviceCatalog(bus);
  const source = [keyboardDescriptor({ availability: 'available' })];

  await bus.publish(events.create(TIMER_EVENTS.DEVICE_CATALOG_UPDATED, { devices: source }));
  source[0] = keyboardDescriptor({ availability: 'unavailable' });

  expect(catalog.devices[0].availability).toBe('available');
  expect(catalog.find(TIMER_DEVICE_IDS.KEYBOARD)?.id).toBe(TIMER_DEVICE_IDS.KEYBOARD);
});
```

- [ ] **Step 2: Run the focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceCatalog.test.ts --maxWorkers=1
```

Expected: fail because `DeviceCatalog` does not exist.

- [ ] **Step 3: Implement the projection**

Implement a class with `devices: readonly TimerDeviceDescriptor[] = $state([])`, subscribe in the constructor, clone/freeze every descriptor and capabilities array, replace the whole array for every catalog event, and unsubscribe idempotently in `destroy()`.

```ts
export class DeviceCatalog {
  devices: readonly TimerDeviceDescriptor[] = $state([]);
  private subscription: TimerEventSubscription | null;

  constructor(bus: ITimerEventBus) {
    this.subscription = bus.subscribe(
      TIMER_EVENTS.DEVICE_CATALOG_UPDATED,
      'device-catalog:replace',
      event => {
        this.devices = Object.freeze(event.payload.devices.map(device => Object.freeze({
          ...device,
          capabilities: Object.freeze([...device.capabilities]),
        })));
      },
    );
  }

  find(deviceId: string): TimerDeviceDescriptor | undefined {
    return this.devices.find(device => device.id === deviceId);
  }

  destroy(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}
```

- [ ] **Step 4: Run focused test and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceCatalog.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/devices/DeviceCatalog.svelte.ts src/lib/timer/devices/DeviceCatalog.test.ts
```

Expected: all DeviceCatalog tests pass and ESLint exits 0.

- [ ] **Step 5: Commit the projection**

```powershell
git add -- src/lib/timer/devices/DeviceCatalog.svelte.ts src/lib/timer/devices/DeviceCatalog.test.ts
git -c commit.gpgsign=false commit -m "feat: project reactive timer device catalog"
```

### Task 3: Implement successful leasing and contention rejection

**Files:**

- Create: `src/lib/timer/devices/DeviceManager.ts`
- Create: `src/lib/timer/devices/DeviceManager.test.ts`
- Create: `src/lib/timer/devices/TimerDeviceTestHarness.ts`

**Interfaces:**

- Consumes: shared bus/factory, managed `ITimerDevice`, owner bindings, active-device commands.
- Produces: `registerDevice(device)`, `registerOwner(ownerId, binding)`, complete catalog snapshots, and exclusive leases.

- [ ] **Step 1: Create a deterministic fake device harness**

The test fake records `start`, `stop`, `disconnect`, and `destroy` calls; stores the most recent activation context; and exposes `startError`, `stopError`, and `disconnectError` fields that make the corresponding method throw exactly once when set.

- [ ] **Step 2: Write failing success/idempotency/contention tests**

Test:

- initial managed descriptor publication;
- owner registration;
- successful lease and `ACTIVE_DEVICE_CHANGED`;
- same-owner same-device request calls `start` once;
- second owner receives `already-in-use` and does not start;
- two owners can lease two different devices;
- all accepted changes publish a complete catalog snapshot.

```ts
await bus.publish(events.create(TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED, {
  ownerId: 'timer:one',
  deviceId: keyboard.descriptor.id,
}));

expect(keyboard.calls).toEqual(['start:timer:one']);
expect(catalog.find(keyboard.descriptor.id)?.leaseOwnerId).toBe('timer:one');
```

- [ ] **Step 3: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
```

Expected: fail because DeviceManager is absent.

- [ ] **Step 4: Implement registration, immutable snapshots, and serialized change handling**

DeviceManager owns maps for managed devices, legacy descriptors, owners, leases by owner, owners by device, and reservations. Subscribe once to each manager command. EventBus already drains handlers serially; never launch lifecycle work outside the awaited handler.

For a change request:

1. reject missing owner;
2. reject missing managed device as `device-not-found`;
3. publish idempotent `ACTIVE_DEVICE_CHANGED` without another `start`;
4. reject a lease/reservation belonging to another owner;
5. reserve the target;
6. stop the prior device while retaining its lease;
7. start target with `{ ownerId, ...ownerBinding }`;
8. release prior maps only after target start succeeds;
9. assign target lease, publish changed, then publish the full catalog;
10. always clear reservation.

All manager facts use `events.create(...)`, never reuse the request timestamp.

- [ ] **Step 5: Run focused tests and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts src/lib/timer/devices/TimerDeviceTestHarness.ts
```

Expected: manager success/contention tests pass and ESLint exits 0.

- [ ] **Step 6: Commit successful lease management**

```powershell
git add -- src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts src/lib/timer/devices/TimerDeviceTestHarness.ts
git -c commit.gpgsign=false commit -m "feat: manage exclusive timer device leases"
```

### Task 4: Add release, disconnect, recovery, and owner cleanup

**Files:**

- Modify: `src/lib/timer/devices/DeviceManager.ts`
- Modify: `src/lib/timer/devices/DeviceManager.test.ts`

**Interfaces:**

- Produces: safe switch rollback, explicit release/disconnect handling, owner cleanup, quarantined error devices, and idempotent manager destruction.

- [ ] **Step 1: Write failing lifecycle-failure tests**

Add independent tests proving:

- switch order is `old.stop`, then `new.start`;
- switch never calls `old.disconnect`;
- old stop failure rejects with `stop-failed`, does not start target, and marks old unavailable/error;
- target start failure releases its reservation and restarts old;
- failed old restart leaves old leased but activation/error availability unavailable;
- release stops then publishes released;
- release stop failure retains/quarantines lease and publishes release rejected;
- explicit disconnect stops a lease first, releases it, disconnects, and updates connection status;
- disconnect failure publishes `DEVICE_DISCONNECT_FAILED` and leaves device unavailable;
- owner destroy stops/releases and removes the reading route;
- destroyed owner cannot receive fake readings;
- manager destroy unsubscribes and destroys devices once.

- [ ] **Step 2: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
```

Expected: the new failure/release cases fail.

- [ ] **Step 3: Implement recovery exactly as specified**

Use `try/catch/finally` around each device operation. Never expose a failed device as available. Route readings through a lookup rather than closing over a stale callback:

```ts
const activation: TimerDeviceActivationContext = {
  ownerId,
  readonlyView: binding.readonlyView,
  onReading: reading => this.owners.get(ownerId)?.onReading(reading),
};
```

On target start failure, attempt `previous.device.start(previousActivation)` before publishing the original `start-failed` rejection. On owner destruction, delete the binding even if stop fails so later readings are dropped.

- [ ] **Step 4: Run focused tests and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts
```

Expected: all manager tests pass and ESLint exits 0.

- [ ] **Step 5: Commit failure-safe lifecycle handling**

```powershell
git add -- src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts
git -c commit.gpgsign=false commit -m "feat: recover timer device lease failures"
```

### Task 5: Compose one application runtime without changing timer behavior

**Files:**

- Create: `src/lib/timer/TimerApplicationRuntime.ts`
- Create: `src/lib/timer/TimerApplicationRuntime.test.ts`
- Create: `src/lib/timer/context/timerApplicationContext.ts`

**Interfaces:**

- Produces: `createTimerApplicationRuntime(options)`, `TimerApplicationRuntime`, `setTimerApplicationContext`, and `getTimerApplicationContext`.
- Consumes: one clock, ID provider, log sink, EventBus, factory, catalog, and manager.

- [ ] **Step 1: Write failing composition tests**

Assert one factory/bus is shared by catalog, manager, and logger; catalog exists before the first manager snapshot; `ready` resolves after initial registrations; and `destroy()` is idempotent.

- [ ] **Step 2: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerApplicationRuntime.test.ts --maxWorkers=1
```

Expected: fail because application runtime does not exist.

- [ ] **Step 3: Implement application composition**

Expose:

```ts
export interface TimerApplicationRuntime {
  readonly events: TimerEventFactory;
  readonly bus: TimerEventBus;
  readonly catalog: DeviceCatalog;
  readonly deviceManager: DeviceManager;
  readonly ready: Promise<void>;
  destroy(): Promise<void>;
}

export interface TimerApplicationRuntimeOptions {
  clock?: IMonotonicClock;
  idProvider?: IEventIdProvider;
  eventLogSink?: TimerEventLogSink | null;
  devices?: readonly ITimerDevice[];
}
```

Construct in this order: factory, bus, logger, catalog, manager, device registrations. Destroy in reverse ownership order: manager, catalog, logger. Do not wire it into `+layout.svelte` in Group 1.

- [ ] **Step 4: Run all Group 1 verification**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/events/timer src/lib/timer/devices src/lib/timer/TimerApplicationRuntime.test.ts --maxWorkers=1
pnpm exec eslint src/lib/events/timer src/lib/timer/devices src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/context/timerApplicationContext.ts
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run --maxWorkers=1
```

Expected: focused tests pass, ESLint reports zero errors, and the full unit suite reports zero failures.

- [ ] **Step 5: Commit application composition**

```powershell
git add -- src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/context/timerApplicationContext.ts
git -c commit.gpgsign=false commit -m "feat: compose application-scoped timer services"
```

### Group 1 Acceptance Gate

Stop. Report all commits, file changes, and exact verification output. Explain that production behavior is intentionally unchanged. Give the user focused commands to rerun the manager/catalog tests and wait for approval before Group 2.

---

## Commit Group 2: Keyboard Ownership and Exact-Once Routing

### Task 6: Scope lifecycle facts and make KeyboardDevice owner-activated

**Files:**

- Modify: `src/lib/events/timer/TimerEventPayloadMap.ts`
- Modify: `src/lib/events/timer/TimerEventTypes.test-d.ts`
- Modify: `src/lib/timer/TimerReactor.ts`
- Modify: `src/lib/timer/TimerReactor.test.ts`
- Modify: `src/lib/timer/TimerState.svelte.ts`
- Modify: `src/lib/timer/TimerState.test.ts`
- Modify: `src/lib/timer/devices/KeyboardDevice.ts`
- Modify: `src/lib/timer/devices/KeyboardDevice.test.ts`
- Modify: `src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Modify: `src/lib/logger/TimerEventLogger.test.ts`
- Modify: `src/lib/events/timer/TimerEventBus.test.ts`
- Modify: `src/lib/events/timer/TimerEventFactory.test.ts`

**Interfaces:**

- Produces: required `ownerId` on timer-local device lifecycle facts; `TimerReactor(bus, state, ownerId)`; owner-scoped rejection state; subscriptions and actor created on `KeyboardDevice.start(context)` and removed on `stop()`.

- [ ] **Step 1: Write failing two-reactor tests**

Create two states/reactors sharing one bus. Publish lifecycle and rejection events for owner one and assert owner two remains unchanged. Assert accepted change clears the matching owner's error and release clears only that owner's `activeDeviceId`.

Extend KeyboardDevice tests to prove constructor alone ignores keyboard events; start attaches exactly two subscriptions; stop clears readings/subscriptions without disconnect; a stopped device ignores input; a later start with another owner creates a fresh actor and emits only that owner ID; destroy is idempotent; and canonical ID is used in every fact.

- [ ] **Step 2: Run focused tests and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerReactor.test.ts src/lib/timer/TimerState.test.ts src/lib/timer/devices/KeyboardDevice.test.ts --maxWorkers=1
```

Expected: fail because reactors are not owner-scoped and KeyboardDevice owns subscriptions in its constructor.

- [ ] **Step 3: Add owner payloads and filtering**

Add `ownerId` to prevention, ready, inspection, green-light, run start/stop/cancel, pause/resume, step, and penalty payloads. Add:

```ts
deviceSelectionError: {
  deviceId: string;
  reason: DeviceLeaseRejectionReason;
} | null = $state(null);
```

Wrap every owner-scoped reactor handler with an early return when `event.payload.ownerId !== this.ownerId`. Include owner ID in subscription IDs, for example `timer-reactor:${ownerId}:run-started`.

- [ ] **Step 4: Move KeyboardDevice actor and subscriptions into activation lifetime**

Constructor receives only bus, factory, and options. `start(context)` first calls `stop()`, creates a new actor with `context.readonlyView`, `context.ownerId`, and `context.onReading`, subscribes with owner-qualified keyboard handler IDs, and starts the actor. `stop()` clears the interval, unsubscribes, stops the actor, and nulls all activation fields. `disconnect()` delegates to `stop()` because keyboard has no physical connection. `destroy()` delegates idempotently to `stop()`.

All lifecycle payloads use:

```ts
{ ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD }
```

- [ ] **Step 5: Update all existing lifecycle test fixtures with explicit owner IDs**

Use `ownerId: 'timer:test'`; do not weaken the payload type to optional.

- [ ] **Step 6: Run focused tests, event tests, and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/events/timer src/lib/timer/TimerReactor.test.ts src/lib/timer/TimerState.test.ts src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts --maxWorkers=1
pnpm exec eslint src/lib/events/timer src/lib/timer/TimerReactor.ts src/lib/timer/TimerReactor.test.ts src/lib/timer/TimerState.svelte.ts src/lib/timer/TimerState.test.ts src/lib/timer/devices/KeyboardDevice.ts src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts
```

Expected: all focused tests pass and ESLint exits 0.

- [ ] **Step 7: Commit owner-scoped keyboard lifecycle**

```powershell
git add -- src/lib/events/timer src/lib/timer/TimerReactor.ts src/lib/timer/TimerReactor.test.ts src/lib/timer/TimerState.svelte.ts src/lib/timer/TimerState.test.ts src/lib/timer/devices/KeyboardDevice.ts src/lib/timer/devices/KeyboardDevice.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/logger/TimerEventLogger.test.ts
git -c commit.gpgsign=false commit -m "feat: scope keyboard lifecycle by timer owner"
```

### Task 7: Share application services across timer runtimes

**Files:**

- Modify: `src/lib/timer/TimerApplicationRuntime.ts`
- Modify: `src/lib/timer/TimerApplicationRuntime.test.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.svelte.ts`
- Modify: `src/lib/timer/TimerCompositionRoot.test.ts`
- Modify: `src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts`

**Interfaces:**

- Produces: application-owned keyboard/boundary; `createTimerRuntime({ application, ownerId, flags, onTimerReading })`; `requestActiveDevice`; `releaseActiveDevice`; asynchronous `destroy()`.

- [ ] **Step 1: Write failing shared-runtime tests**

Create one application and two timer runtimes. Assert the exact same bus/factory/catalog references, owner-filtered state, two-owner keyboard contention, reading delivery only to the winner, release on runtime destroy, and successful acquisition by the second owner afterward.

- [ ] **Step 2: Run focused tests and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts --maxWorkers=1
```

Expected: fail because each timer currently creates its own bus/device.

- [ ] **Step 3: Register one keyboard and boundary in the application runtime**

Expose:

```ts
readonly keyboardBoundary: KeyboardInputBoundary;
```

Construct one `KeyboardDevice`, include it in DeviceManager registration, and construct one boundary from the shared bus/factory.

- [ ] **Step 4: Refactor timer composition around an owner**

Use this public shape:

```ts
export interface TimerRuntimeOptions {
  application: TimerApplicationRuntime;
  ownerId?: string;
  flags?: Partial<TimerMigrationFlags>;
  onTimerReading?: TimerReadingCallback;
}

export interface TimerRuntime {
  readonly ownerId: string;
  readonly state: TimerState;
  readonly readonlyView: TimerReadonlyView;
  readonly application: TimerApplicationRuntime;
  readonly flags: TimerMigrationFlags;
  requestActiveDevice(deviceId: string, nativeEvent?: NativeTimestampSource): Promise<boolean>;
  releaseActiveDevice(deviceId: string): Promise<boolean>;
  destroy(): Promise<void>;
}
```

Register `{ readonlyView, onReading }`, create `TimerReactor(sharedBus, state, ownerId)`, publish native requests with `fromNative` and programmatic requests with `create`, and return acceptance by checking owner-scoped `state.activeDeviceId` after the bus drain. Destroy publishes `DEVICE_OWNER_DESTROY_REQUESTED`, then destroys the reactor.

- [ ] **Step 5: Run focused tests and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts
```

Expected: shared-runtime and contention tests pass; ESLint exits 0.

- [ ] **Step 6: Commit shared timer composition**

```powershell
git add -- src/lib/timer/TimerApplicationRuntime.ts src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.svelte.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/devices/KeyboardTimerFlow.integration.test.ts
git -c commit.gpgsign=false commit -m "feat: share timer bus across runtime owners"
```

### Task 8: Own native Space/Escape once and expose a test flag

**Files:**

- Create: `src/lib/timer/handlers/TimerKeyboardEventBoundary.svelte`
- Create: `src/lib/timer/handlers/TimerKeyboardEventBoundary.test.ts`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerTab/TimerTab.svelte`
- Modify: `src/lib/timer/context/timerContext.ts`
- Modify: `src/routes/timer/[sessionId]/+page.svelte`
- Create: `src/lib/timer/KeyboardRouteFlag.test.ts`

**Interfaces:**

- Consumes: root application context and shared keyboard boundary.
- Produces: one global native Space/Escape publisher; query-controlled `/timer/:id?eventDrivenKeyboard=1`; legacy suppression only while managed keyboard is active.

- [ ] **Step 1: Write failing source/integration tests**

Assert root layout creates/sets/destroys one application runtime; the boundary forwards `event.timeStamp`; Timer.svelte no longer publishes Space/Escape itself; TimerTab skips legacy key/pointer forwarding only when `managedKeyboardActive`; and the route query parameter passes the flag while default remains false.

- [ ] **Step 2: Run focused tests and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/handlers/TimerKeyboardEventBoundary.test.ts src/lib/timer/KeyboardRouteFlag.test.ts --maxWorkers=1
```

Expected: fail because the shared Svelte boundary/context wiring is absent.

- [ ] **Step 3: Wire application runtime in the root layout**

During component initialization:

```ts
const timerApplication = createTimerApplicationRuntime();
setTimerApplicationContext(timerApplication);
onDestroy(() => void timerApplication.destroy());
```

Render `TimerKeyboardEventBoundary` once beside `EventDebugPanel`.

- [ ] **Step 4: Implement the global boundary**

Use `<svelte:window onkeydown={keyDown} onkeyup={keyUp} />`; forward the native event directly to `application.keyboardBoundary`; do not generate timestamps with `performance.now()`.

- [ ] **Step 5: Create the timer runtime from application context**

Timer.svelte gets the application runtime, creates one owner runtime, projects its state into the legacy controller bridge, and requests keyboard programmatically only when the query flag is enabled and the loaded session input normalizes to keyboard. Add a `normalizeTimerDeviceId` helper that maps both the canonical ID and legacy string `Keyboard` to `TIMER_DEVICE_IDS.KEYBOARD`.

Expose `managedKeyboardActive` through timer context. TimerTab returns before legacy key and pointer delivery only when that value is true. Arrow tab-navigation remains in `useKeyboardHandler` and does not publish timer input events.

- [ ] **Step 6: Run Group 2 verification**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/handlers src/lib/timer/devices src/lib/timer/TimerApplicationRuntime.test.ts src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/TimerReactor.test.ts src/lib/timer/KeyboardRouteFlag.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer src/routes/+layout.svelte src/routes/timer/[sessionId]/+page.svelte
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run --maxWorkers=1
```

Expected: focused tests pass, ESLint has zero errors, and full unit suite has zero failures.

- [ ] **Step 7: Commit exact-once routing**

```powershell
git add -- src/lib/timer/handlers/TimerKeyboardEventBoundary.svelte src/lib/timer/handlers/TimerKeyboardEventBoundary.test.ts src/routes/+layout.svelte src/lib/timer/Timer.svelte src/lib/timer/TimerTab/TimerTab.svelte src/lib/timer/context/timerContext.ts src/routes/timer/[sessionId]/+page.svelte src/lib/timer/KeyboardRouteFlag.test.ts
git -c commit.gpgsign=false commit -m "feat: route keyboard input through application bus"
```

### Group 2 Acceptance Gate

Stop. Give the user these manual steps:

1. Open `/timer/<sessionId>?eventDrivenKeyboard=1` for a keyboard-configured session.
2. Open the event debugger.
3. Press/hold/release Space through prevention, start, and stop.
4. Confirm one key event and one lifecycle transition per native action, canonical keyboard ID, owner ID, and browser timestamps.
5. Remove the query parameter and confirm legacy behavior remains.

Wait for user approval before Group 3.

---

## Commit Group 3: Reactive Selection and Conflict UI

### Task 9: Publish legacy metadata into the managed catalog

**Files:**

- Create: `src/lib/timer/devices/LegacyDeviceCatalogBridge.ts`
- Create: `src/lib/timer/devices/LegacyDeviceCatalogBridge.test.ts`
- Modify: `src/lib/timer/devices/DeviceManager.ts`
- Modify: `src/lib/timer/devices/DeviceManager.test.ts`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/cubicdbKit/DeviceIcon.svelte`

**Interfaces:**

- Produces: store-to-event serializable descriptor sync; managed-ID precedence; DeviceIcon support for descriptors.

- [ ] **Step 1: Write failing bridge/merge tests**

Prove the bridge publishes initial and later store values; payloads contain no functions/instances; keyboard legacy descriptor is replaced by the managed keyboard descriptor; removed legacy devices disappear; dynamic Stackmat/GAN metadata updates; bridge destroy unsubscribes.

- [ ] **Step 2: Run focused tests and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/LegacyDeviceCatalogBridge.test.ts src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
```

Expected: fail because sync/merge does not exist.

- [ ] **Step 3: Implement metadata conversion and merge**

Map each legacy instance to `{ id, name, type, connectionStatus, capabilities }`. Never place `init`, handlers, interpreter, or the instance itself in the event. DeviceManager replaces its legacy map on every sync and publishes managed descriptors first plus non-colliding legacy descriptors with fixed transitional fields:

```ts
{
  ...legacy,
  activationStatus: 'stopped',
  availability: 'available',
  managementMode: 'legacy',
  leaseOwnerId: null,
}
```

- [ ] **Step 4: Update DeviceIcon to consume metadata**

Change its prop to the minimal structural type `{ type: string; connectionStatus?: TimerDeviceConnectionStatus; isConnected?: boolean }`. Prefer `connectionStatus` and retain `isConnected` only for callers not yet migrated.

- [ ] **Step 5: Wire bridge lifecycle in root layout**

Construct it after setting application context and destroy it before application runtime destruction.

- [ ] **Step 6: Run focused tests and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/devices/LegacyDeviceCatalogBridge.test.ts src/lib/timer/devices/DeviceManager.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/devices/LegacyDeviceCatalogBridge.ts src/lib/timer/devices/LegacyDeviceCatalogBridge.test.ts src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts src/lib/cubicdbKit/DeviceIcon.svelte src/routes/+layout.svelte
```

Expected: bridge/merge tests pass and ESLint exits 0.

- [ ] **Step 7: Commit catalog bridge**

```powershell
git add -- src/lib/timer/devices/LegacyDeviceCatalogBridge.ts src/lib/timer/devices/LegacyDeviceCatalogBridge.test.ts src/lib/timer/devices/DeviceManager.ts src/lib/timer/devices/DeviceManager.test.ts src/routes/+layout.svelte src/lib/cubicdbKit/DeviceIcon.svelte
git -c commit.gpgsign=false commit -m "feat: bridge legacy devices into event catalog"
```

### Task 10: Select managed devices before persisting settings

**Files:**

- Modify: `src/lib/timer/TimerTab/TimerOptions.svelte`
- Create: `src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts`
- Modify: `src/lib/timer/context/timerContext.ts`
- Modify: `src/lib/lang/en-EN.ts`
- Modify: `src/lib/lang/es-ES.ts`
- Modify: `src/lib/lang/zh-ZH.ts`
- Modify: `src/lib/interfaces/language.types.ts`

**Interfaces:**

- Consumes: DeviceCatalog and owner runtime client from timer context.
- Produces: catalog-only option rendering, unavailable-device disabling, native save timestamps, persist-after-acceptance, and conflict notification.

- [ ] **Step 1: Write failing UI source/behavior tests**

Assert TimerOptions no longer imports `$devices`; Select items are `application.catalog.devices`; managed devices leased by another owner are disabled; save handler accepts `MouseEvent | KeyboardEvent`; request receives the native event; managed input is persisted only after acceptance; rejection retains previous input and shows a conflict; legacy descriptors use the explicit legacy `initInputHandler` bridge.

- [ ] **Step 2: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts --maxWorkers=1
```

Expected: fail against direct `$devices` mutation/persistence-before-init.

- [ ] **Step 3: Capture the actual save input timestamp**

Replace the inline save callback with `saveDialog(event)` and pass the `MouseEvent` from click or `KeyboardEvent` from Ctrl+Enter into the settings close handler. Do not synthesize a native timestamp.

- [ ] **Step 4: Split managed and legacy save paths**

For `managementMode === 'managed'`, await `runtime.requestActiveDevice(deviceId, nativeEvent)`. Persist all settings only on acceptance. On rejection, persist non-input settings with the previous input, leave the selected session input unchanged, and notify using new translated `TIMER.deviceAlreadyInUse`/`TIMER.deviceUnavailable` keys.

For `managementMode === 'legacy'`, first release any managed lease, then use the existing legacy initialization bridge and persist the chosen legacy input. Do not claim a legacy lease in DeviceCatalog.

- [ ] **Step 5: Run focused tests and lint**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts src/lib/timer/TimerTab/TimerOptionsTooltip.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer/TimerTab/TimerOptions.svelte src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts src/lib/timer/context/timerContext.ts src/lib/lang/en-EN.ts src/lib/lang/es-ES.ts src/lib/lang/zh-ZH.ts src/lib/interfaces/language.types.ts
```

Expected: selection and existing tooltip tests pass; ESLint exits 0.

- [ ] **Step 6: Commit selection UI**

```powershell
git add -- src/lib/timer/TimerTab/TimerOptions.svelte src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts src/lib/timer/context/timerContext.ts src/lib/lang/en-EN.ts src/lib/lang/es-ES.ts src/lib/lang/zh-ZH.ts src/lib/interfaces/language.types.ts
git -c commit.gpgsign=false commit -m "feat: select timer devices through event catalog"
```

### Task 11: Coordinate session load, legacy fallback boundary, and teardown

**Files:**

- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/utilities/useInitialization.ts`
- Create: `src/lib/timer/devices/LegacyDeviceActivationBridge.ts`
- Create: `src/lib/timer/devices/LegacyDeviceActivationBridge.test.ts`
- Create: `src/lib/timer/TimerDeviceSelection.integration.test.ts`
- Modify: `src/lib/timer/TimerTab/TimerTab.svelte`

**Interfaces:**

- Produces: one selection operation per effective session input; full legacy InputContext instead of `as any`; managed release before legacy activation; lease release on timer destruction.

- [ ] **Step 1: Write failing session/teardown tests**

Cover keyboard-configured session load, repeated reactive session projection without duplicate start, switch to a legacy descriptor releasing keyboard first, legacy init receiving the complete `InputContext`, switch back to keyboard stopping the legacy actor without calling physical `disconnect()`, and timer teardown releasing keyboard.

- [ ] **Step 2: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerDeviceSelection.integration.test.ts --maxWorkers=1
```

Expected: fail because selection is duplicated/incomplete and legacy init uses `{ timerController } as any`.

- [ ] **Step 3: Implement the temporary legacy activation bridge**

Create this focused interface and behavior:

```ts
interface LegacyDeviceRuntime {
  readonly id: string;
  enabled: boolean;
  interpreter?: { stop(): void } | null;
  init(context: InputContext): void | Promise<void>;
}

export class LegacyDeviceActivationBridge {
  private active: LegacyDeviceRuntime | null = null;

  async activate(device: LegacyDeviceRuntime, context: InputContext): Promise<void> {
    if (this.active === device) return;
    this.deactivate();
    await device.init(context);
    device.enabled = true;
    this.active = device;
  }

  deactivate(): void {
    this.active?.interpreter?.stop();
    if (this.active) this.active.enabled = false;
    this.active = null;
  }
}
```

Tests must prove idempotency, old actor stop before new init, no `disconnect()` call, and disabled state after deactivate.

- [ ] **Step 4: Make initialization receive a real context provider**

Change `useInitialization` to receive `getInputContext: () => InputContext` and a timer-owned `LegacyDeviceActivationBridge`, then call `bridge.activate(selected, getInputContext())`. Remove `{ timerController } as any`.

- [ ] **Step 5: Deduplicate session selection in Timer.svelte**

Track the last `{ sessionId, normalizedDeviceId }`. When it changes, use DeviceCatalog management mode to choose the managed request or legacy bridge. On component destroy, await/publish owner cleanup without destroying the application runtime.

- [ ] **Step 6: Run Group 3 verification**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/TimerDeviceSelection.integration.test.ts src/lib/timer/TimerTab/TimerOptionsDeviceSelection.test.ts src/lib/timer/devices/LegacyDeviceActivationBridge.test.ts src/lib/timer/devices src/lib/timer/TimerCompositionRoot.test.ts --maxWorkers=1
pnpm exec eslint src/lib/timer src/routes/+layout.svelte src/lib/cubicdbKit/DeviceIcon.svelte src/lib/lang src/lib/interfaces/language.types.ts
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run --maxWorkers=1
```

Expected: focused tests pass, ESLint has zero errors, and full unit suite has zero failures.

- [ ] **Step 7: Commit session coordination**

```powershell
git add -- src/lib/timer/Timer.svelte src/lib/timer/utilities/useInitialization.ts src/lib/timer/devices/LegacyDeviceActivationBridge.ts src/lib/timer/devices/LegacyDeviceActivationBridge.test.ts src/lib/timer/TimerDeviceSelection.integration.test.ts src/lib/timer/TimerTab/TimerTab.svelte
git -c commit.gpgsign=false commit -m "feat: coordinate timer device selection lifecycle"
```

### Group 3 Acceptance Gate

Stop. Ask the user to test `/timer/<sessionId>?eventDrivenKeyboard=1`:

1. Open settings and confirm every existing device still appears.
2. Confirm the keyboard descriptor uses the managed path and legacy devices remain selectable.
3. Change Keyboard → legacy → Keyboard and inspect stop/release/catalog events.
4. Confirm rejected/unavailable selections show a conflict and do not change the saved input.
5. Navigate away/back and confirm the lease is released/reacquired without duplicate key events.

Wait for approval before Group 4.

---

## Commit Group 4: Production Route Activation

### Task 12: Enable the keyboard slice by default on timer sessions

**Files:**

- Modify: `src/routes/timer/[sessionId]/+page.svelte`
- Modify: `src/lib/timer/KeyboardRouteFlag.test.ts`
- Create: `src/lib/timer/KeyboardProductionRoute.integration.test.ts`
- Modify: `docs/superpowers/plans/2026-07-12-timer-event-driven-migration.md`

**Interfaces:**

- Produces: production `/timer/[sessionId]` event-driven keyboard activation with a one-line rollback.

- [ ] **Step 1: Write failing production-route assertions**

Assert the route renders `<Timer eventDrivenKeyboard />` without requiring the query parameter, and the integration flow produces exactly one prevention/start/stop lifecycle for a Space sequence while the legacy keyboard handler spy remains untouched.

- [ ] **Step 2: Run focused test and verify red**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/KeyboardRouteFlag.test.ts src/lib/timer/KeyboardProductionRoute.integration.test.ts --maxWorkers=1
```

Expected: fail because production default remains legacy.

- [ ] **Step 3: Enable the route and update migration status**

Change the route to:

```svelte
<Timer eventDrivenKeyboard />
```

Mark the keyboard/device-management hardening tasks completed in the existing migration plan, record the four acceptance gates, and retain the documented rollback of removing the prop.

- [ ] **Step 4: Run final non-build verification**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run src/lib/timer/KeyboardRouteFlag.test.ts src/lib/timer/KeyboardProductionRoute.integration.test.ts src/lib/timer/devices src/lib/timer/TimerCompositionRoot.test.ts src/lib/timer/TimerReactor.test.ts --maxWorkers=1
pnpm exec eslint .
$env:NODE_OPTIONS='--max-old-space-size=1536'; pnpm test:unit --run --maxWorkers=1
```

Expected: focused tests pass, repository ESLint reports zero errors, and full unit suite reports zero failures. Do not run build or `svelte-check`.

- [ ] **Step 5: Commit production activation**

```powershell
git add -- src/routes/timer/[sessionId]/+page.svelte src/lib/timer/KeyboardRouteFlag.test.ts src/lib/timer/KeyboardProductionRoute.integration.test.ts docs/superpowers/plans/2026-07-12-timer-event-driven-migration.md
git -c commit.gpgsign=false commit -m "feat: activate event-driven keyboard timer"
```

### Group 4 Acceptance Gate

Stop and ask the user to test the actual `/timer/<sessionId>` route without a query parameter. Confirm prevention, inspection if enabled, start, live readings, stop, cancellation, settings changes, navigation teardown, event debugger timestamps, and absence of duplicate events. Do not begin solve persistence or another device migration until the user accepts production behavior.
