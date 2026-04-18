# Event-Driven Architecture: Definition Phase Summary

**Status**: ✅ **Definition Phase Complete (with User Clarifications)**  
**Date**: April 18, 2026 (Updated with 15 Clarifications)  
**Scope**: Complete specification of what needs to be implemented, incorporating all user clarifications

---

## Overview

This document summarizes all architectural definitions created to guide implementation. Everything is **defined but not yet implemented**.

All 15 critical ambiguities have been clarified and incorporated into permanent documentation (see [CLARIFICATIONS_INCORPORATED.md](CLARIFICATIONS_INCORPORATED.md)).

---

## What Is Defined

### 1. **Core Concepts**
- ✅ Result type (`Result<T, E>`) for error handling
- ✅ Event system (EventBus, Event Dispatcher, queued sequential execution)
- ✅ Domain events (typed, discriminated unions)
- ✅ Repository pattern with error handling
- ✅ Use case architecture (separate from handlers)
- ✅ Services architecture (DeviceManager, ScrambleService, CelebrationService, etc.)

### 2. **Domain Model**
- ✅ Entity definitions: Solve, Session, Algorithm, Reconstruction, Tutorial
- ✅ Value objects: Penalty, SessionSettings, SessionType
- ✅ Relationships and invariants
- ✅ Multi-step solve support

### 3. **Event System**
- ✅ Timer events: DeviceEnteredPrevention, DeviceReady, DeviceStartedRunning, DeviceStopped, etc.
- ✅ Device events: DeviceDiscovered, DeviceConnected, DeviceDisconnected, ActiveDeviceChanged
- ✅ Solve events: SolveAdded, SolveUpdated, SolvesRemoved, SolveSelected
- ✅ Session events: SessionCreated, SessionSwitched, SessionUpdated, SessionSettingsChanged
- ✅ Scramble events: ScrambleRequested, ScrambleGenerated, ScrambleGenerationFailed
- ✅ Statistics events: StatisticsUpdated (with newRecords), RequestStatisticsCalculation
- ✅ System events: HandlerError, ConfigUpdated

### 4. **Use Cases (Complete Specifications)**
- ✅ **Solve**: CreateSolve (in-memory only), AddSolve (persist), UpdateSolve, RemoveSolves, GetSolves, SelectSolve
- ✅ **Session**: CreateSession, SwitchSession (with compatibility check), UpdateSession, RemoveSession, SelectSession, ApplySessionSettings
- ✅ **Device**: DiscoverDevices, ConnectDevice, SelectDevice (with compatibility), DisconnectDevice
- ✅ **Statistics**: CalculateStatistics (progressive, not full recalculation, async use case)
- ✅ **Scramble**: RequestScramble (with deduplication)
- ✅ **Penalty**: ApplyPenalty, ChangePenalty
- ✅ **Timer**: ResetTimer, CancelSolve (always to CLEAN)
- ✅ **Config**: PersistConfig (immediate save, section-specific)

### 5. **Event Handlers (Complete Specifications)**
- ✅ **Solve Handlers**: SolveAdded (emits ScrambleRequested + RequestStatisticsCalculation, NOT StatisticsUpdated), SolveUpdated, SolvesRemoved, SolveSelected
- ✅ **Session Handlers**: SessionCreated, SessionSwitched, SessionUpdated, SessionSettingsChanged, SessionDeleted
- ✅ **Device Handlers**: DeviceDiscovered, DeviceConnected, DeviceDisconnected, ActiveDeviceChanged
- ✅ **Statistics Handlers**: CalculateStatistics (triggered by RequestStatisticsCalculation)
- ✅ **Scramble Handlers**: RequestScramble
- ✅ **Timer State Handlers**: DeviceEnteredPrevention, DeviceReady, DeviceStartedInspection, DeviceGreenLight, DeviceStartedRunning, DeviceStopped, DevicePaused, DeviceResumed, DeviceCancelled, DeviceDNF
- ✅ **Handler Execution**: Sequential, queued order, cannot see each other's state updates within same event
- ✅ **Error Handling**: Fail gracefully, emit HandlerError, other handlers continue

### 6. **Services Architecture** (NEW)
- ✅ **DeviceManager**: Singleton service listening to SessionSwitched, DeviceDisconnected
  - Manages device-session binding
  - Checks compatibility
  - Fallback to Keyboard (always available)
- ✅ **ScrambleService**: Listens to ScrambleRequested, emits ScrambleGenerated with requestId
  - Tries multiple generators
  - Falls back to empty scramble
  - Deduplication in handler (not service)
- ✅ **ImageService**: Listens to ScrambleGenerated, generates preview images asynchronously
- ✅ **CelebrationService**: Listens to StatisticsUpdated, triggers celebrations based on newRecords
- ✅ **AnalyticsService**: Logs user actions and metrics
- ✅ **ConfigService**: Persists config changes immediately, section-specific

### 7. **Devices Architecture**
- ✅ Device interface definition (IDevice)
- ✅ Device discovery interface (IDeviceDiscovery)
- ✅ Device lifecycle (Discovery → Connection → Binding → Operation → Disconnection)
- ✅ Device compatibility rules (Keyboard compatible with everything, GAN iCarry only 3x3, etc.)
- ✅ DeviceManager coordination and fallback logic
- ✅ High-frequency data channel (onTimeUpdate callback)
- ✅ Device state machines (internal to device, only events emitted)
- ✅ Platform-specific implementations (Web vs Electron)

### 8. **Repository Ports (Database/Persistence)**
- ✅ ISolveRepository: CRUD for solves, batch operations, statistics
- ✅ ISessionRepository: CRUD for sessions, search
- ✅ IAlgorithmRepository: Read-only algorithms, tree structure, user preferences
- ✅ IReconstructionRepository: User reconstruction storage
- ✅ ITutorialRepository: Read-only learning resources
- ✅ ICacheRepository: Cache management
- ✅ IConfigRepository: Key-value config store (section-specific persistence)
- ✅ IThemeRepository: Theme management

### 9. **Error Handling**
- ✅ Result type with Ok/Err variants
- ✅ Domain-specific error enums
- ✅ Error propagation patterns
- ✅ Exception vs Result distinction
- ✅ HandlerError event for displaying errors to users
- ✅ Handler failure strategies (retry, fallback, silently continue)

### 10. **Data Flow**
- ✅ From user action to event emission
- ✅ From event to handler execution (sequential, queued)
- ✅ From use case to repository persistence
- ✅ Cross-entity relationships and cascading updates
- ✅ Timer state managed via $state (not through handlers)
- ✅ Reactive statistics with newRecords tracking

---

## User Clarifications Incorporated

All 15 critical ambiguities have been clarified and integrated:

1. ✅ TimerState structure (reactive, includes solves + statistics + devices)
2. ✅ ScrambleService autonomy (listens to events, emits results)
3. ✅ Statistics progressive calculation (not full recalculation, async)
4. ✅ NewRecord event trigger (separate from StatisticsUpdated)
5. ✅ DeviceManager as singleton service
6. ✅ Device compatibility after session switch
7. ✅ CreateSolve vs AddSolve relationship (instantiate vs persist)
8. ✅ Handler sequential execution (cannot call each other, queued events)
9. ✅ SolveAdded does NOT emit StatisticsUpdated
10. ✅ Error handling (fail gracefully, emit error event, continue)
11. ✅ Session persistence (immediate save, section-specific)
12. ✅ Scramble deduplication (mode + prob comparison)
13. ✅ Multi-step solves (steps stored in solve, UI shows current)
14. ✅ Device incompatibility (UI filtering, don't show incompatible)
15. ✅ Timer cancellation (always to CLEAN)

See [CLARIFICATIONS_INCORPORATED.md](CLARIFICATIONS_INCORPORATED.md) for full details.

---

## What Is NOT Yet Implemented
| **Device** | VirtualDevice | ❌ Not created |
| **Device** | StackmatDevice | ⚠️ Exists but not event-driven |
| **Device** | GANDevice | ⚠️ Exists but not event-driven |
| **Device** | QiYiDevice | ❌ Not created |
| **Device** | DeviceManager | ❌ Not created |
| **Repository** | Adapters for all ports | ❌ Missing or incomplete |
| **Use Cases** | Algorithm use cases | ❌ Not created |
| **Use Cases** | Reconstruction use cases | ❌ Not created |
| **Use Cases** | Tutorial use cases | ❌ Not created |
| **Use Cases** | Theme use cases | ❌ Not created |
| **Use Cases** | Config use cases | ❌ Not created |
| **Handlers** | algorithmHandlers | ❌ Not created |
| **Handlers** | reconstructionHandlers | ❌ Not created |
| **Handlers** | deviceHandlers (full wiring) | ⚠️ Partially defined |
| **Service** | ScrambleService (event integration) | ⚠️ Exists but not wired |
| **Service** | StatisticsService | ❌ Not created |
| **Service** | CelebrationService | ❌ Not created |
| **Service** | AnalyticsService | ❌ Not created |

---

## Definition Documents Created

1. **docs/architecture/timer/use-cases.md** (NEW)
   - All 20+ use cases with detailed specifications
   - Inputs, processing, outputs for each
   - Validation rules
   - Event emissions

2. **docs/architecture/timer/handlers.md** (NEW)
   - All handler specifications
   - Processing logic for each event
   - Handler dependencies and ordering
   - Error handling patterns

3. **docs/architecture/timer/devices.md** (UPDATED)
   - Device interface definitions
   - Device discovery specification
   - Device lifecycle
   - Event definitions
   - Platform-specific implementations

4. **docs/architecture/core/result-type.md** (NEW)
   - Result<T, E> type definition
   - Error enums per domain
   - Usage patterns and examples
   - Exception vs Result distinction

5. **docs/architecture/core/repository-ports.md** (NEW)
   - All 8 repository interfaces
   - Method signatures with full specs
   - Error handling
   - Storage location per environment
   - Adapter selection mechanism

---

## Event Flow Diagrams

### Example: Adding a Solve

```
1. Device measures time, emits:
   DeviceStopped(deviceId, time, steps?)
   
2. EventBus routes to handlers:
   
   a) Timer State Handler:
      - Sets timerState = STOPPED
      - Sets time = event.time
      
   b) Solve Handler:
      - Calls AddSolve use case
      - Receives SolveAdded(solve)
      - Updates $state.solves[]
      - Updates $state.lastSolve = solve
      
   c) Statistics Handler:
      - Calls CalculateStatistics use case
      - Compares with previous bests
      - Emits StatisticsUpdated(stats)
      - Shows "New record!" if applicable
      
   d) Scramble Handler:
      - Calls RequestScramble use case
      - Generates new scramble
      - Emits ScrambleGenerated(scramble)
      
3. UI automatically re-renders because $state changed
   - Shows new time
   - Shows new statistics
   - Shows new scramble
   - Shows celebration (optional)
```

---

## How Implementation Should Proceed

### Phase 0: Infrastructure (Already Done)
- ✅ EventBus with type-safe pub/sub
- ✅ EventDispatcher wrapper
- ✅ Domain event types
- ✅ Logger system

### Phase 1: Core State & Reactor
**Create**:
- `src/lib/timer/TimerState.ts` — $state for all timer state
- `src/lib/timer/TimerReactor.ts` — Subscribe to events, update TimerState
- `src/lib/core/ports/IDevice.ts` — Device interface
- `src/lib/core/ports/IDeviceDiscovery.ts` — Device discovery interface

### Phase 2: Keyboard Device
**Create**:
- `src/lib/devices/KeyboardDevice.ts` — New implementation, XState-based
- `src/lib/events/handlers/deviceHandlers.ts` — Wire devices to reactor

### Phase 3: Manual & Virtual Devices
**Create**:
- `src/lib/devices/ManualDevice.ts`
- `src/lib/devices/VirtualDevice.ts`

### Phase 4: Repository Adapters
**Create**:
- `src/lib/adapters/IndexedDBSolveRepository.ts`
- `src/lib/adapters/IndexedDBSessionRepository.ts`
- `src/lib/adapters/IndexedDBAlgorithmRepository.ts`
- etc. for all repos

### Phase 5: Use Cases & Handlers
**Create**:
- Algorithm use cases (AddAlgorithm, UpdateAlgorithm, RemoveAlgorithm)
- Reconstruction use cases
- Tutorial use cases
- Theme use cases
- Config use cases
- Corresponding handlers

### Phase 6: Services Integration
**Wire**:
- ScrambleService to emit events
- StatisticsService to calculate metrics
- CelebrationService to handle NewRecord events
- AnalyticsService to track events

### Phase 7: UI Integration
**Update**:
- Components to dispatch events instead of calling dataService
- Components to subscribe to events instead of polling
- Remove legacy dataService calls

### Phase 8: Cleanup
**Remove**:
- Old TimerController
- Old InputContext
- Old adaptors/
- Duplicate emitters
- Legacy stores

---

## Key Principles (For Implementation)

### 1. Events Command, State Obeys
```
Event arrives → Handler updates $state → UI re-renders
```

### 2. One Direction Flow
```
User action → Event → Handler → Use Case → Repository → Storage
                ↓
            Handler updates $state
                ↓
            UI re-renders from $state
```

### 3. Errors Return, Don't Throw
```ts
// ✅ Good
return Err("validation_failed");

// ❌ Bad
throw new Error("validation failed");
```

### 4. High-Frequency Data Bypasses EventBus
```ts
// Time (60+/sec) → Direct callback
device.onTimeUpdate((ms) => state.time = ms);

// Domain events (occasional) → EventBus
device.emit(new DeviceStopped(time));
```

### 5. Handlers Don't Call Each Other
```ts
// ❌ Bad: A handler calls another handler
handler1.call(handler2);

// ✅ Good: Both subscribe to same event or chain through events
eventBus.subscribe(Event1, handler1);
eventBus.subscribe(Event2, handler2);
```

### 6. Async All The Way
```ts
// All handlers are async and awaited
await eventBus.emit(event);
```

---

## Testing Strategy (For Implementation)

### Unit Tests
- Test use cases with mocked repositories
- Test handlers with mocked event bus
- Verify Result<T, E> error handling

### Integration Tests
- Test end-to-end flows (user action → event → state update)
- Use real repositories (but in-memory)
- Do NOT mock EventBus

### Example:
```ts
describe('AddSolve workflow', () => {
  it('should add solve and update statistics', async () => {
    // Setup
    const mockRepo = new InMemorySolveRepository();
    const useCase = new AddSolve(mockRepo, eventBus);
    
    // Execute
    const result = await useCase.execute(newSolve);
    
    // Verify
    assert(result.isOk());
    const events = eventBus.getEmittedEvents();
    assert(events.some(e => e instanceof SolveAdded));
    assert(events.some(e => e instanceof StatisticsUpdated));
  });
});
```

---

## Documentation Index

**Core Architecture**:
- `docs/architecture/domain-model.md` — Entity definitions
- `docs/architecture/core/result-type.md` — Error handling
- `docs/architecture/core/repository-ports.md` — Persistence layer

**Timer/Devices** (most detailed):
- `docs/architecture/timer/README.md` — Overview
- `docs/architecture/timer/use-cases.md` — All use cases
- `docs/architecture/timer/handlers.md` — Event handlers
- `docs/architecture/timer/events.md` — Event definitions
- `docs/architecture/timer/devices.md` — Device architecture
- `docs/architecture/timer/reactor.md` — Reactor pseudocode
- `docs/architecture/timer/state.md` — State management
- `docs/architecture/timer/sessions.md` — Session switching
- `docs/architecture/timer/solves.md` — Solve CRUD
- `docs/architecture/timer/statistics.md` — Statistics calculation
- `docs/architecture/timer/settings.md` — Configuration
- `docs/architecture/timer/scramble.md` — Scramble generation

**Development**:
- `docs/development/conventions.md` — Code style, naming
- `docs/development/git.md` — Branching, commits
- `docs/development/testing.md` — Test structure

---

## Recommended Reading Order

For someone starting implementation:

1. **Start here**: `docs/architecture/README.md` (this directory index)
2. **Understand domain**: `domain-model.md`
3. **Core concepts**: `core/result-type.md`, `core/repository-ports.md`
4. **Event system**: `timer/events.md`
5. **Device architecture**: `timer/devices.md`
6. **Use cases**: `timer/use-cases.md`
7. **Handlers**: `timer/handlers.md`
8. **Integration**: `timer/reactor.md`, `timer/state.md`

---

## Questions This Defines Answers

### "What should happen when a solve is completed?"
→ See `docs/architecture/timer/use-cases.md` → **AddSolve** section

### "What events are emitted during a solve?"
→ See `docs/architecture/timer/events.md` → Timer Input Events

### "How should handlers coordinate?"
→ See `docs/architecture/timer/handlers.md` → Handler Execution Order

### "How do devices communicate?"
→ See `docs/architecture/timer/devices.md` → Device Events

### "How should errors be handled?"
→ See `docs/architecture/core/result-type.md` → Result Type Definition

### "What data should be persisted?"
→ See `docs/architecture/core/repository-ports.md` → All repository interfaces

### "How should statistics be calculated?"
→ See `docs/architecture/timer/statistics.md` → Metrics & Algorithms

---

## Success Criteria

Implementation is successful when:

- ✅ All use cases can be invoked and return Result<T, E>
- ✅ All handlers subscribe to their events and execute
- ✅ All events follow the types defined in events files
- ✅ All repositories implement their interface contracts
- ✅ A complete solve (create → run → stop → save) works end-to-end
- ✅ Statistics recalculate automatically after each solve
- ✅ Devices can be switched and work correctly
- ✅ Errors are caught and shown to users (not exceptions)
- ✅ All UI state comes from $state (not manual updates)
- ✅ Tests pass for all use cases and handlers

---

## Contact & Questions

If implementation reveals ambiguities or conflicts:

1. **Check the definitions first** — Likely defined somewhere
2. **Review the flow diagrams** — See examples in `timer/handlers.md`
3. **Look at test examples** — See `docs/development/testing.md`
4. **Ask: "What event should happen?"** — Event-driven thinking

The definitions are comprehensive. Ambiguities during implementation should be rare and indicate a definition gap that should be documented.

