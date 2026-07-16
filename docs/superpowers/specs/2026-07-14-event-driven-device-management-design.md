# Event-Driven Device Management Design

**Date:** 2026-07-14

**Status:** Approved

**Related documents:**

- `docs/superpowers/specs/2026-07-12-timer-event-driven-migration-design.md`
- `docs/superpowers/plans/2026-07-12-timer-event-driven-migration.md`

## Purpose

Complete the keyboard vertical slice on top of an application-scoped device-management boundary. Device discovery, availability, selection, ownership, and lifecycle changes communicate through the typed timer EventBus. Consumers read device data from a reactive projection populated only by bus events.

This design moves the minimum DeviceManager foundation originally scheduled for migration PR 7 into the keyboard slice. Session compatibility for all remaining devices stays in its later PR.

## Decisions

- The application may have multiple active devices.
- Each timer or other device consumer may own at most one active-device lease.
- A device may be leased by only one owner.
- A request for a device leased by another owner is rejected; ownership never transfers automatically.
- A conflict is visible to the user and does not silently select a fallback or change persisted session settings.
- Selecting another device stops and releases the previous device. It does not disconnect it.
- `disconnect()` is reserved for explicit disconnection, physical/device loss, or application shutdown.
- Device metadata is reactive and globally available, but device instances remain private to DeviceManager.
- High-frequency readings use the already-approved direct callback exception. Lifecycle and business communication uses events.
- Existing persisted canonical IDs remain unchanged. The keyboard ID is `cubicdb:device:timer_keyboard`.
- Every event uses the existing `{ id, type, timestamp, payload }` envelope.
- Native UI input events use the browser-provided timestamp. Programmatic results use the monotonic clock at the time the result occurs.

## Architecture

### Application-Scoped EventBus

The application owns one generic `EventBus`, plus the timer event factory, DeviceManager, DeviceCatalog, and event logger. Timer events are a typed namespace on the application bus; they do not use a separate bus implementation. Every mounted timer runtime receives these shared services from application context instead of constructing another bus.

Events that mutate a timer-local projection include `ownerId`. Each TimerReactor is constructed with its own owner ID and ignores lifecycle facts for other owners. Application-wide device facts such as catalog and physical connection changes remain unscoped. Future event slices must carry either `ownerId` or another explicit domain key whenever multiple consumers could otherwise project the same fact.

This produces one diagnostic event stream, one serialized lease authority, and no bridge between application and timer buses. Tests may construct an isolated application runtime, but multiple timer runtimes in the same test share that application's bus.

### DeviceManager

DeviceManager is application-scoped and is the sole owner of actual device instances. It:

- registers canonical devices and their serializable descriptors;
- owns lease and reservation state;
- serializes lifecycle commands;
- validates existence, compatibility, availability, and idempotency;
- invokes `start()`, `stop()`, `disconnect()`, and `destroy()`;
- routes high-frequency readings to the current lease owner;
- publishes lifecycle facts and catalog snapshots;
- catches expected device-operation failures and publishes typed rejection facts.

No UI component, timer runtime, store, or session utility may call a migrated device instance directly.

### DeviceCatalog

DeviceCatalog is a read-only reactive projection. It subscribes to catalog events and exposes the latest immutable snapshot to application and timer contexts.

The application composition root constructs DeviceCatalog before DeviceManager registers devices, so the initial `DEVICE_CATALOG_UPDATED` snapshot cannot be missed.

Each descriptor contains only serializable data:

- canonical `id`;
- display `name`;
- device `type`;
- `connectionStatus`: `connected`, `disconnected`, or `error`;
- `activationStatus`: `stopped`, `starting`, `active`, `stopping`, or `error`;
- `availability`: `available`, `in-use`, or `unavailable`;
- `managementMode`: `managed` or `legacy`;
- `leaseOwnerId` or `null`;
- a readonly list of capability identifiers, empty when the device declares none.

DeviceCatalog never contains device instances or lifecycle methods. Consumers cannot mutate its internal state.

### Device Owners

Each mounted timer runtime receives a unique owner ID. The composition root calls `DeviceManager.registerOwner(ownerId, { readonlyView, onReading })` when it creates the timer runtime. The readonly view is the reactive read API already approved for devices, and the callback establishes the approved high-frequency reading path. This direct composition wiring cannot select, start, stop, or disconnect a device. All lifecycle requests still use events. An owner may hold no more than one active-device lease.

Destroying an owner releases its lease after stopping the device. A stale owner must not continue receiving readings or native input.

## Bus as the Application API

The bus is the write and communication API. Reactive projections are the read API.

Consumers publish commands and observe facts rather than requesting device instances. This avoids request/response ambiguity, correlation timeouts, duplicate responders, and a global mutable service locator while retaining event-driven communication.

The contract retains the existing active-device event names and adds the missing outcomes:

| Event constant | Payload |
|---|---|
| `ACTIVE_DEVICE_CHANGE_REQUESTED` | `{ ownerId: string; deviceId: string }` |
| `ACTIVE_DEVICE_CHANGED` | `{ ownerId: string; previousDeviceId: string \| null; deviceId: string }` |
| `ACTIVE_DEVICE_CHANGE_REJECTED` | `{ ownerId: string; deviceId: string; reason: DeviceLeaseRejectionReason }` |
| `ACTIVE_DEVICE_RELEASE_REQUESTED` | `{ ownerId: string; deviceId: string }` |
| `ACTIVE_DEVICE_RELEASED` | `{ ownerId: string; deviceId: string }` |
| `ACTIVE_DEVICE_RELEASE_REJECTED` | `{ ownerId: string; deviceId: string; reason: 'stop-failed' }` |
| `DEVICE_DISCONNECT_REQUESTED` | `{ deviceId: string }` |
| `DEVICE_DISCONNECT_FAILED` | `{ deviceId: string; reason: 'disconnect-failed' }` |
| `DEVICE_CATALOG_UPDATED` | `{ devices: readonly TimerDeviceDescriptor[] }` |
| `LEGACY_DEVICE_CATALOG_SYNC_REQUESTED` | `{ devices: readonly LegacyTimerDeviceDescriptor[] }` |
| `DEVICE_OWNER_DESTROY_REQUESTED` | `{ ownerId: string }` |

Existing `DEVICE_CONNECTED` and `DEVICE_DISCONNECTED` facts continue to represent connection state.

The timer lifecycle events `DEVICE_PREVENTION_ENTERED`, `DEVICE_READY`, `DEVICE_INSPECTION_STARTED`, `DEVICE_GREEN_LIGHT_CHANGED`, `DEVICE_RUN_STARTED`, `DEVICE_RUN_STOPPED`, `DEVICE_RUN_CANCELLED`, `DEVICE_PAUSED`, `DEVICE_RESUMED`, `DEVICE_STEP_COMPLETED`, and `DEVICE_PENALTY_APPLIED` add `ownerId` beside `deviceId`. TimerReactor filters all of them by its configured owner ID.

`DeviceLeaseRejectionReason` is the closed union:

- `device-not-found`;
- `already-in-use`;
- `incompatible-device`;
- `start-failed`;
- `stop-failed`;
- `owner-not-registered`.

## Selection Flow

1. A native UI action publishes an active-device change request using the browser timestamp.
2. DeviceManager serializes the request with other lifecycle operations.
3. It verifies the owner and requested device.
4. It rejects a lease held by another owner without changing either owner.
5. It treats selection of the owner's current device as an idempotent success.
6. For a real switch, it reserves the requested device so another owner cannot acquire it mid-transition.
7. It stops the old device while temporarily retaining the old lease.
8. It starts the requested device.
9. After successful start, it releases the old lease, confirms the new lease, and publishes the active-device-changed fact.
10. It publishes a complete immutable catalog snapshot.

The result fact receives a programmatic monotonic timestamp representing when the result occurs. It does not reuse the native request timestamp.

## Failure Recovery

- If validation fails, DeviceManager publishes a typed rejection and leaves current state unchanged.
- If stopping the previous device fails, the switch is aborted, the new reservation is released, and the old device remains unavailable to other owners until its state is resolved.
- If starting the new device fails, DeviceManager releases the new reservation and attempts to restart the previous device while retaining its lease.
- If recovery of the previous device also fails, the owner has no operational active device and the affected device is marked unavailable/error.
- A device with an unresolved stop or disconnect failure is never advertised as available.
- An explicit disconnect or physical loss stops the device, releases its lease, removes its reading route, and publishes the existing disconnected fact before the new catalog snapshot.
- Expected lifecycle failures do not escape as exceptions. Unexpected EventBus handler failures continue to use `HANDLER_FAILED`.
- Persisted session input settings are not rewritten after a lease or lifecycle failure.

## Keyboard Integration

- KeyboardDevice uses canonical ID `cubicdb:device:timer_keyboard`.
- DeviceManager owns the KeyboardDevice instance.
- `start()` makes keyboard input processing active.
- `stop()` makes keyboard input processing inactive and cancels its transient timers/readings without disconnect semantics.
- Only the leased, started keyboard processes browser keyboard events.
- Timer.svelte and TimerTab.svelte do not both deliver the same native event when the migration flag is active.
- Space and Escape events retain browser timestamps at the input boundary.
- The keyboard high-frequency reading callback is routed only to its lease owner.
- The production timer route stays behind the migration flag until the infrastructure and UI integration have passed automated and user acceptance.

## Vertical Migration Boundary

TimerOptions must continue to offer all current devices while the keyboard is the only fully migrated device. A temporary legacy catalog bridge subscribes to the existing legacy device store, converts instances to serializable `LegacyTimerDeviceDescriptor` values, and publishes `LEGACY_DEVICE_CATALOG_SYNC_REQUESTED`. DeviceManager merges those descriptors into each complete catalog snapshot, with managed registrations taking precedence when IDs collide.

The UI reads only DeviceCatalog after this bridge is installed. A descriptor's `managementMode` determines its transitional activation path:

- `managed` devices use EventBus lease commands and DeviceManager lifecycle ownership;
- `legacy` devices retain their existing activation code until their own vertical migration.

The bridge carries metadata only. It never publishes device instances or exposes them through DeviceCatalog. Exclusive leasing is guaranteed for managed devices; the implementation must not falsely represent legacy devices as lease-managed. Each later device migration registers the canonical ID with DeviceManager, which replaces the matching legacy descriptor. The bridge and legacy activation path are deleted after the final device migration.

A narrow `LegacyDeviceActivationBridge` owns the temporary activation reference for one timer. It deactivates a legacy actor/interpreter without invoking physical `disconnect()`, then calls the existing `init(InputContext)` only when a legacy descriptor is selected. This bridge does not grant leases and is removed as each legacy implementation becomes managed.

## UI Behavior

Timer settings render device choices from DeviceCatalog rather than the legacy device-instance store after the UI slice is enabled.

- Devices leased by another owner are visibly unavailable.
- Attempting to select one shows the typed conflict.
- The current session setting is preserved after rejection.
- No keyboard fallback is selected silently.
- Successful selection updates the active-device projection.
- The UI does not invoke device methods.

## Testing Strategy

### Unit Tests

- initial immutable catalog snapshot;
- serializable descriptors without device instances;
- canonical IDs;
- successful lease and release;
- one lease per owner;
- one owner per device;
- different owners leasing different devices concurrently;
- idempotent repeated selection;
- switch ordering and reservation behavior;
- switch uses `stop()` rather than `disconnect()`;
- explicit disconnection uses `disconnect()`;
- already-in-use rejection leaves state unchanged;
- start and stop failure recovery;
- unresolved failures mark devices unavailable;
- rapid requests are serialized deterministically;
- owner destruction stops and releases its device;
- catalog replacement after every accepted lifecycle change.

### Integration Tests

- only the leased keyboard processes native input;
- a browser event is processed exactly once;
- native keyboard timestamps reach the corresponding lifecycle flow unchanged where required;
- high-frequency readings reach only the lease owner;
- switching away from keyboard stops input and readings;
- two timer runtimes contend safely for the keyboard;
- timer destruction releases the keyboard for another owner;
- disabled migration flags preserve the legacy behavior;
- session load and settings changes publish selection intent;
- conflicts are displayed without changing persisted settings;
- the `/timer/[sessionId]` route processes Space through only the event-driven path after activation.

### Verification Commands

Each implementation group runs focused Vitest tests, ESLint, and the full unit suite with one worker. No build is run. `svelte-check` is excluded until the user explicitly requests it.

## Implementation Checkpoint: Managed Keyboard Activation

As of 2026-07-16, the production timer route uses the application-scoped runtime for the canonical keyboard while the other device implementations remain on their legacy paths.

- The root layout creates one `TimerApplicationRuntime`, exposes it through Svelte context, and owns the single browser keyboard boundary.
- The application runtime registers `cubicdb:device:timer_keyboard` with `DeviceManager` by default.
- Each timer registers an owner binding using `timer:<sessionId>` and requests the keyboard lease when its persisted input is Keyboard.
- `TimerReactor` filters device facts by owner, including active-device release and run completion.
- The legacy keyboard listeners are suppressed only while the managed keyboard lease is active, preventing duplicate input processing without removing fallback behavior.
- A managed `DEVICE_RUN_STOPPED` fact saves the solve through the existing `TimerController` persistence path.
- Browser input timestamps determine run start and stop. Space or an unmodified letter stops on keydown; Tab and Ctrl/Alt/Shift/Meta shortcuts are ignored.
- Keyboard prevention follows the session's `withoutPrevention` setting; the enabled hold uses the legacy 200 ms threshold.
- A one-second device-local cooldown ignores input after stopping so an accidental second press cannot begin another attempt.
- Inspection display readings use the owner callback, while typed penalty facts apply +2 at the configured limit and DNF two seconds later. Automatic DNF completes and persists the attempt with its penalty.
- The shared event logger receives the keyboard, ownership, and lifecycle facts, so the existing non-blocking debugger can inspect the live flow.
- Timer teardown publishes an owner-destroy request, which stops the device and releases the lease rather than disconnecting it.

This checkpoint does not yet render `DeviceCatalog` in TimerOptions or show lease conflicts in the UI. Those remain the next acceptance-gated group. No route query or temporary route flag is required.

## Reversible Commit Groups and Acceptance Gates

### Group 1: Device Bus API and Reactive Catalog

Add typed events, device lifecycle contracts, DeviceManager, DeviceCatalog, and their tests. Do not connect them to the production timer UI.

Rollback removes isolated infrastructure without changing runtime behavior.

**Acceptance gate:** Report exact changes and automated results. Provide focused inspection or test instructions and wait for user approval before Group 2.

### Group 2: Keyboard Ownership and Routing

Register KeyboardDevice with DeviceManager, enforce canonical identity and lease ownership, and route readings to the owner without connecting the production timer UI.

Rollback disables or removes the keyboard migration wiring while retaining the legacy keyboard path.

**Acceptance gate:** Report exact changes and automated results before activating the production timer path.

### Group 3: Production Keyboard Activation

Create the application runtime in the root layout, attach one native keyboard boundary, request the managed keyboard from persisted timer input, suppress duplicate legacy keyboard delivery, save managed run completion through the existing controller, expose all events to the debugger, and release the lease on teardown.

Rollback removes the layout/timer composition wiring while leaving DeviceManager and KeyboardDevice available and restoring the legacy keyboard path.

**Acceptance gate:** Report exact changes and automated results. Let the user test the actual timer route, event visibility, lifecycle behavior, solve persistence, and teardown before Group 4.

### Group 4: Reactive Selection and Conflict UI

Render the reactive catalog in TimerOptions, add the temporary legacy metadata bridge, publish managed-device selection requests from settings changes, display lease conflicts, and preserve the explicit legacy activation path for devices that have not migrated.

Rollback restores the legacy settings/device adapter while retaining the accepted managed keyboard runtime.

**Acceptance gate:** The user tests selection, contention, persistence, and conflict recovery before any later device slice begins.

## Out of Scope

- Migrating Manual, Virtual, Stackmat, QiYi, GAN, or discovery implementations in these groups.
- Solve persistence, statistics, or scramble migration.
- Removing legacy device adapters before production acceptance.
- Reimplementing or lease-managing non-keyboard legacy devices in these groups.
- Sending high-frequency readings through EventBus.
- Automatically transferring a device lease between owners.
- Silently selecting a fallback device.
- Building the application or running `svelte-check`.
