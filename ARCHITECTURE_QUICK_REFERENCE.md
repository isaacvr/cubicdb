# Event-Driven Architecture: Quick Reference

A quick lookup guide for the complete architecture definition.

---

## Event Categories & Their Documents

| Category | Events | Document |
|----------|--------|----------|
| **Timer State** | DeviceEnteredPrevention, DeviceReady, DeviceStartedRunning, DeviceStopped, DevicePaused, DeviceResumed, DeviceCancelled, DeviceDNF | `timer/events.md` |
| **Solve Lifecycle** | SolveAdded, SolveUpdated, SolvesRemoved, SolveSelected | `timer/events.md` + `timer/use-cases.md` |
| **Session Management** | SessionCreated, SessionSwitched, SessionUpdated, SessionSettingsChanged, SessionDeleted | `timer/events.md` + `timer/use-cases.md` |
| **Device Management** | DeviceDiscovered, DeviceConnected, DeviceDisconnected, ActiveDeviceChanged | `timer/devices.md` |
| **Statistics** | StatisticsUpdated | `timer/statistics.md` |
| **Scramble** | ScrambleGenerated, ScrambleGenerationFailed | `timer/use-cases.md` |
| **System** | HandlerError, ConfigUpdated | `core/result-type.md` |

---

## Use Case Lookup

| Operation | Use Case | Handler | Document |
|-----------|----------|---------|----------|
| **Save a time** | AddSolve | SolveAdded | `timer/use-cases.md` → AddSolve |
| **Edit penalty** | UpdateSolve → ChangePenalty | SolveUpdated | `timer/use-cases.md` → UpdateSolve |
| **Delete solves** | RemoveSolves | SolvesRemoved | `timer/use-cases.md` → RemoveSolves |
| **Switch session** | SwitchSession | SessionSwitched | `timer/use-cases.md` → SwitchSession |
| **Change setting** | ApplySessionSettings | SessionSettingsChanged | `timer/use-cases.md` → ApplySessionSettings |
| **Connect device** | ConnectDevice | DeviceConnected | `timer/use-cases.md` → ConnectDevice |
| **Select device** | SelectDevice | ActiveDeviceChanged | `timer/use-cases.md` → SelectDevice |
| **Calculate stats** | CalculateStatistics | StatisticsUpdated | `timer/statistics.md` |
| **Generate scramble** | RequestScramble | ScrambleGenerated | `timer/use-cases.md` → RequestScramble |

---

## Event Flow Template

For any event, follow this flow:

```
1. EVENT EMITTED
   Where: See events.md
   By: Device, User action, or system
   Contains: data needed by handlers
   
2. HANDLERS EXECUTE (in priority order)
   a) State handlers (priority 100) — update $state
   b) Use case handlers (priority 50) — trigger business logic
   c) Service handlers (priority 25) — external operations
   d) UI handlers (priority 0) — UI-specific updates
   
3. NEW EVENTS EMITTED (from handlers)
   Causes: Cascading handler execution
   Example: SolveAdded → StatisticsUpdated → NewRecord
   
4. STATE UPDATED ($state)
   Source: State handlers
   Triggers: UI re-render (Svelte reactivity)
   
5. UI REFLECTS CHANGES
   From: $state
   No manual updates
```

---

## Handler Dependency Graph

```
DeviceStopped
├─ Timer State Handler → sets timerState = STOPPED
├─ Solve Handler → calls AddSolve use case
│  └─ emits SolveAdded
│     ├─ Statistics Handler → recalculates metrics
│     ├─ Scramble Handler → generates new scramble
│     └─ Analytics Handler → tracks event
└─ (Other devices emit different events)
```

---

## Repository Lookup

| Entity | Repository | Methods | Document |
|--------|------------|---------|----------|
| **Solve** | ISolveRepository | get, getBySolver, add, update, remove, removeBySolver, getStatistics, clearSolver | `core/repository-ports.md` |
| **Session** | ISessionRepository | get, getAll, add, update, remove, findByName | `core/repository-ports.md` |
| **Algorithm** | IAlgorithmRepository | get, getAll, getTree, getSubtree, search, updateUserPreferences | `core/repository-ports.md` |
| **Reconstruction** | IReconstructionRepository | get, getBySolver, add, update, remove, getRelatedAlgorithms | `core/repository-ports.md` |
| **Tutorial** | ITutorialRepository | get, getAll, search, getProgress, updateProgress | `core/repository-ports.md` |
| **Cache** | ICacheRepository | get, set, remove, clear, getStats | `core/repository-ports.md` |
| **Config** | IConfigRepository | get, getMany, set, setMany, remove, getAll, subscribe | `core/repository-ports.md` |
| **Theme** | IThemeRepository | getActive, getAll, get, setActive, create, update, remove | `core/repository-ports.md` |

---

## Error Handling Patterns

```ts
// Use Result everywhere (not exceptions for domain errors)
type Result<T, E> = Ok<T> | Err<E>;

// Define error enums per domain
enum RepositoryError { NOT_FOUND, DUPLICATE, VALIDATION_FAILED, ... }
enum TimerError { DEVICE_NOT_FOUND, TIMER_NOT_CLEAN, ... }

// In use cases: return Result, log error
async execute(): Result<T, E> {
  try {
    return Ok(result);
  } catch (e) {
    logger.error(...);
    return Err(error);
  }
}

// In handlers: match result
match(result, {
  Ok: (value) => { /* update state */ },
  Err: (error) => { 
    logger.error(...);
    emit HandlerError event
  }
});

// In components: show user feedback
if (result.isOk()) {
  showNotification('Success!');
} else {
  showError(`Failed: ${result.error}`);
}
```

---

## State Management Patterns

### Don't Use
- ❌ writable() stores
- ❌ readable() stores
- ❌ Manual updates outside handlers
- ❌ Component-local state that mirrors global state

### Do Use
- ✅ `$state` for all reactive state
- ✅ `$derived` for computed values
- ✅ EventBus for communication
- ✅ Handlers to update state

```ts
// Example: Timer state
export let state = $state({
  timerState: TimerState.CLEAN,
  time: 0,
  ready: false,
  scramble: '',
  solves: [],
  lastSolve: null,
  statistics: null,
  currentSession: null,
  activeDevice: null,
});

// Updated only by handlers
eventBus.subscribe(DeviceStopped, (event) => {
  state.timerState = TimerState.STOPPED;
  state.time = event.time;
  // Svelte automatically re-renders
});
```

---

## Device Interface Reference

```ts
interface IDevice {
  readonly id: string;
  readonly type: DeviceType;
  
  // Binding lifecycle
  bind(session, readonlyView, onTimeUpdate): Promise<void>;
  unbind(): Promise<void>;
  
  // Compatibility check
  isCompatible(session): boolean;
  
  // Status (optional)
  getStatus?(): DeviceStatus;
}

interface IDeviceDiscovery {
  startScanning(filter?): Promise<void>;
  stopScanning(): Promise<void>;
  getDiscoveredDevices(): IDiscoveredDevice[];
}
```

---

## High-Frequency vs Domain Events

| Path | Frequency | Transport | Example |
|------|-----------|-----------|---------|
| **High-frequency** | 60+/second | Direct callback | Running time: `onTimeUpdate(ms)` |
| **Domain events** | Occasional | EventBus | `DeviceStopped(time)` |

```ts
// High-frequency: direct callback (no EventBus)
device.onTimeUpdate = (ms) => {
  state.time = ms; // Updated instantly
};

// Domain events: through EventBus
device.emit(new DeviceStopped(time));
```

---

## Phase Implementation Sequence

```
Phase 0 ✅: Infrastructure (EventBus, events, logger)
     ↓
Phase 1 ⬜: TimerState + TimerReactor + Keyboard device
     ↓
Phase 2 ⬜: Manual + Virtual devices
     ↓
Phase 3 ⬜: Repository adapters
     ↓
Phase 4 ⬜: Algorithm, Reconstruction, Tutorial use cases
     ↓
Phase 5 ⬜: Service integration (ScrambleService, etc.)
     ↓
Phase 6 ⬜: UI component updates (use events, not dataService)
     ↓
Phase 7 ⬜: Cleanup (remove old code)
```

---

## Common Scenarios & How They Flow

### Scenario 1: Complete a Solve

```
1. Device detects solve completion → DeviceStopped event
2. Timer State Handler updates state.timerState = STOPPED
3. Solve Handler calls AddSolve use case
4. Adds to database, emits SolveAdded
5. Statistics Handler recalculates metrics → StatisticsUpdated
6. Scramble Handler generates new scramble → ScrambleGenerated
7. UI re-renders from updated $state
```

### Scenario 2: Switch Session

```
1. User selects new session → SessionSwitchRequested event
2. Session Handler calls SwitchSession use case
3. Validates timer is CLEAN
4. Checks device compatibility → DeviceConnectionRequested if needed
5. Checks scramble compatibility → RequestScramble if needed
6. Emits SessionSwitched
7. UI updates session list and timer display
```

### Scenario 3: Bluetooth Device Disconnects

```
1. BLE connection drops → DeviceDisconnected(gan, 'hardware_error')
2. Device Handler receives event
3. If was active device:
   a) Cancels ongoing solve (if any)
   b) Switches to Keyboard device
   c) Shows user notification
4. Timer falls back to Keyboard
5. User can continue timing
```

---

## Document Locations Quick Access

```
📂 docs/architecture/
├── 📄 README.md (start here - index)
├── 📄 domain-model.md (entities)
├── 📄 data-layer.md (architecture overview)
├── 📂 core/
│   ├── 📄 result-type.md (error handling)
│   └── 📄 repository-ports.md (database interfaces)
└── 📂 timer/
    ├── 📄 README.md (timer overview)
    ├── 📄 use-cases.md (all use cases - most detailed)
    ├── 📄 handlers.md (event handlers)
    ├── 📄 events.md (all event types)
    ├── 📄 devices.md (device architecture)
    ├── 📄 reactor.md (reactor pseudocode)
    ├── 📄 state.md (state management)
    ├── 📄 sessions.md (session switching)
    ├── 📄 solves.md (solve CRUD)
    ├── 📄 statistics.md (calculations)
    ├── 📄 settings.md (configuration)
    ├── 📄 scramble.md (scramble generation)
    └── 📄 migration.md (implementation phases)

📄 DEFINITION_PHASE_SUMMARY.md (this overall summary)
```

---

## Key File Paths for Implementation

```
src/lib/
├── core/
│   ├── domain/
│   │   ├── Result.ts (not yet created)
│   │   └── Solve.ts (already exists)
│   ├── ports/
│   │   ├── IDevice.ts (not yet created)
│   │   ├── IDeviceDiscovery.ts (not yet created)
│   │   ├── ISolveRepository.ts (exists)
│   │   ├── ISessionRepository.ts (exists)
│   │   ├── IAlgorithmRepository.ts (exists)
│   │   └── ... (other repos)
│   └── usecases/
│       ├── AddSolve.ts (exists, needs update)
│       ├── AddSession.ts (exists)
│       └── ... (20+ total)
├── events/
│   ├── EventBus.ts ✅
│   ├── EventDispatcher.ts ✅
│   ├── types.ts ✅
│   ├── domain/
│   │   ├── TimerEvents.ts ✅
│   │   ├── SolveEvents.ts ✅
│   │   ├── SessionEvents.ts ✅
│   │   ├── DeviceEvents.ts (not yet created)
│   │   ├── AlgorithmEvents.ts ✅
│   │   └── ... (7 files total)
│   └── handlers/
│       ├── solveHandlers.ts ✅
│       ├── sessionHandlers.ts ✅
│       ├── systemHandlers.ts ✅
│       ├── deviceHandlers.ts (not yet created)
│       ├── scrambleHandlers.ts (not yet created)
│       └── algorithmHandlers.ts (not yet created)
├── timer/
│   ├── TimerState.ts (not yet created)
│   ├── TimerReactor.ts (not yet created)
│   └── ... (UI components)
└── devices/
    ├── KeyboardDevice.ts (not yet created - use XState)
    ├── ManualDevice.ts (not yet created)
    ├── VirtualDevice.ts (not yet created)
    └── ... (hardware devices)

src/lib/adapters/ (or src/lib/repositories/)
├── IndexedDBSolveRepository.ts (not yet created)
├── IndexedDBSessionRepository.ts (not yet created)
├── ElectronSolveRepository.ts (not yet created)
└── ... (many more)
```

---

## Testing Checklist for Each Use Case

For each use case, verify:

```
[ ] Returns Result<T, E> (not exceptions)
[ ] Validates inputs
[ ] Calls repository
[ ] Emits event on success
[ ] Emits event on error
[ ] Logs appropriately
[ ] Handles missing data gracefully
[ ] Can be tested with mocked repo
[ ] Works with other use cases
```

Example test structure:
```ts
describe('AddSolve', () => {
  it('should add solve to repository', () => {
    // Arrange
    // Act
    // Assert
  });
  
  it('should emit SolveAdded event', () => { });
  it('should return Err on validation failure', () => { });
  it('should return Err on persistence failure', () => { });
});
```

---

## Notes for Implementation

1. **Start with Phase 1** — TimerState + TimerReactor + KeyboardDevice
   - This is the core, everything else depends on it
   
2. **Test each phase** — Don't move to next phase until current works
   - Can solve times with keyboard device?
   - Do statistics update?
   - Does UI re-render?
   
3. **Follow the event flow** — Events are the single source of truth
   - If something doesn't work, trace the event
   - Is the event being emitted?
   - Are handlers subscribed?
   - Does the handler emit downstream events?
   
4. **Keep definitions close** — Reference them while implementing
   - Each handler should follow its spec exactly
   - Each use case should match its inputs/outputs
   - Each event should have the exact fields defined
   
5. **Don't implement** — Only define
   - This document is the definition phase
   - Implementation comes later
   - If you see implementation gaps, add to this document

---

## Success Metrics

When the definition phase is complete:

✅ Every event has a clear definition  
✅ Every use case has input/output specs  
✅ Every handler has processing logic  
✅ Every repository has method signatures  
✅ Error handling is consistent  
✅ Data flows are well-defined  
✅ Test cases are clear  
✅ Implementation roadmap is explicit  
✅ Someone new can understand by reading docs  
✅ Implementation can proceed with minimal ambiguity  

---

## Questions During Implementation?

1. **"What should happen when X?"** → See use-cases.md
2. **"What event should be emitted?"** → See events.md
3. **"How should handlers coordinate?"** → See handlers.md
4. **"What's the repository interface?"** → See repository-ports.md
5. **"How do devices work?"** → See devices.md
6. **"How should errors be handled?"** → See result-type.md
7. **"What goes in state?"** → See state.md

If not found in docs, **that's a definition gap** — add it to the docs first.

