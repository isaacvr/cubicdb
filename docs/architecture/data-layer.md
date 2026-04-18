# Data Layer

Target architecture for persistence, environment abstraction, and service communication.

---

## Principles

1. **No centralized hub.** Each repository and service is independent.
2. **EventBus is the default communication channel.** Services emit and subscribe to domain events.
3. **Direct callbacks for high-frequency operations.** Time updates and similar performance-sensitive paths bypass EventBus.
4. **Adapters per environment.** The correct implementation is selected at startup. The selection mechanism is an implementation detail.
5. **Browser content is read-only.** Algorithms, Tutorials, and Reconstructions in the browser are bundled static data.

---

## Repository Ports

Repository interfaces define the persistence boundary. They live in `src/lib/core/ports/`.

| Port | Operations |
|---|---|
| `ISessionRepository` | CRUD for sessions |
| `ISolveRepository` | CRUD for solves |
| `IAlgorithmRepository` | Read algorithms, update user preferences |
| `ITutorialRepository` | Read tutorials |
| `IReconstructionRepository` | CRUD for reconstructions |
| `IConfigRepository` | Key-value configuration storage |
| `ICacheRepository` | Image and video cache |

Each port has at least two adapter implementations:

- **Browser adapter** — IndexedDB, localStorage, or static files depending on the entity.
- **Electron adapter** — Delegates to the main process via contextBridge.

### Read-Only Content (Browser)

Algorithms, Tutorials, and Reconstructions in the browser are loaded from bundled `.db` files.
Their adapters implement the read portion of the interface; write operations are no-ops or throw.

In Electron, these entities support full CRUD because the app manages its own database
and can receive content updates.

---

## Services

ConfigIPC is replaced by independent services, each with a single responsibility.

| Service | Responsibility | Environment |
|---|---|---|
| `WindowService` | Minimize, maximize, close, sleep | Electron only (no-op in browser) |
| `BluetoothService` | BLE device discovery, connection, data relay | Both (WebBluetooth / Electron BLE) |
| `UpdateService` | App update download and installation | Electron only |
| `PDFService` | Scramble sheet generation, file export | Both (different output targets) |
| `DisplayService` | Multi-monitor detection, window positioning | Electron only |

### Communication

Services communicate through the EventBus by default.

```
BluetoothService → emits DeviceDiscovered, DeviceConnected, DeviceData
UpdateService → emits UpdateAvailable, UpdateDownloadProgress, UpdateReady
```

**Exception: high-frequency paths.** Operations that fire many times per second
(e.g., time updates from a device, BLE data streams) use direct callbacks
registered at binding time. The EventBus is not designed for 60+ events/second.

```ts
// High-frequency: direct callback
device.onTimeUpdate((ms) => { state.time = ms; });

// Domain event: through EventBus
eventBus.emit(new DeviceStopped({ time: finalTime }));
```

The rule: if the event triggers UI re-renders at high frequency, use a direct callback.
If the event represents a discrete domain fact, use the EventBus.

---

## Adapter Selection

Adapters are selected per environment at startup. The mechanism (factory function,
DI container, Svelte context) is an implementation detail decided during migration.

The principle: **the application code depends on ports, never on adapters.**
Use cases receive an `ISessionRepository`, not a `IndexedDBSessionAdapter`.

Environment detection is straightforward:

```
Is `window.electronAPI` available?
  Yes → Electron adapters
  No  → Browser adapters
```

No intermediate IPC layer. Adapters talk directly to their storage backend.

---

## Data Flow

### Current (legacy)

```
Component → Controller (writable store) → UseCase → Adapter → DataService → IPC → Storage
```

Problems:
- DataService centralizes all access through a single readable store.
- Controllers duplicate state management with writable stores.
- IPC adds an unnecessary abstraction layer.

### Target

```
Component reads $state ← Reactor updates state ← EventBus
Component action → EventBus → Reactor/Handler → UseCase → Repository port → Adapter → Storage
```

- No DataService. Each adapter is a standalone implementation of a port.
- No controllers. The reactor (and section-specific handlers) process events and update `$state`.
- No IPC layer. Adapters are the lowest abstraction before storage.

### Example: Adding a Solve

```
1. Device emits DeviceStopped(time) → EventBus
2. TimerReactor receives DeviceStopped
   → Creates solve via CreateSolveUseCase
   → Persists via AddSolveUseCase (calls ISolveRepository)
   → Updates state.solves, state.lastSolve
   → Emits SolveAdded(solve) → EventBus
3. StatisticsHandler receives SolveAdded
   → Recalculates statistics
   → Updates state.statistics
4. ScrambleService receives SolveAdded (or DeviceStopped)
   → Generates next scramble
   → Updates state.scramble
5. UI re-renders from $state
```

### Example: Switching Session

```
1. UI dispatches SessionSwitchRequested(sessionId) → EventBus
2. SessionHandler receives SessionSwitchRequested
   → Loads session via GetSessionUseCase
   → Loads solves via GetSolvesUseCase (filtered by session)
   → Updates state.session, state.solves
   → Recalculates statistics
   → Emits SessionSwitched(session) → EventBus
3. ScrambleService receives SessionSwitched
   → Configures scrambler for the new session's puzzle type
   → Generates first scramble
```

---

## What Does NOT Change

- **Repository port interfaces** — Same contracts, different implementations.
- **Use cases** — Same business logic, invoked from event handlers instead of controllers.
- **Domain entities** — Solve, Session, Algorithm, etc. remain as defined in [domain-model.md](domain-model.md).
- **Svelte context for DI** — Components still receive dependencies through context, not imports.

---

## Migration Notes

This layer corresponds to **Phase 7** in the [migration plan](timer/migration.md),
but some changes happen earlier:

- **Phase 0**: TimerState with `$state` replaces controller stores.
- **Phase 5**: Session and Solve operations move to EventBus handlers.
- **Phase 6**: Controllers, Emitter, and old stores are removed.
- **Phase 7**: IPC layer is removed. Adapters are simplified. Services are split.

The IPC removal in Phase 7 is safe because by that point, all consumers
already go through repository ports — the IPC layer is just an internal detail
of the adapters that gets deleted.
