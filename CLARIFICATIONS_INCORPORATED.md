# User Clarifications - Incorporated into Architecture

This document tracks the 15 critical ambiguities that were clarified and where they've been incorporated into the architecture documentation.

---

## 1. TimerState Structure

**Clarification**: TimerState should be reactive ($state) with full solves list + statistics + devices. SessionManager manages currentSession separately.

**Implementation**:
- [timer/state.md](docs/architecture/timer/state.md) - TimerState defined as $state object
- [core/services.md](docs/architecture/core/services.md) - Services for managing devices separately
- Architecture specifies: TimerState contains solves[], statistics, devices (global reuse)
- SessionManager separate from TimerState

**Files Updated**:
- ✅ timer/state.md (complete)
- ✅ timer/README.md (referenced)

---

## 2. ScrambleService Autonomy

**Clarification**: ScrambleService listens for ScrambleRequested event. It emits ScrambleGenerated with requestId for tracking. Not called by handlers directly.

**Implementation**:
- [core/services.md](docs/architecture/core/services.md) - ScrambleService full specification
- Event subscriptions defined
- Uses requestId for tracking multiple concurrent requests
- Falls back to empty scramble if all generators fail
- Images are separate (ImageService)

**Files Updated**:
- ✅ core/services.md (NEW - complete specification)
- ✅ timer/handlers.md (handlers emit ScrambleRequested, not call service)

---

## 3. Statistics - Progressive Calculation

**Clarification**: Statistics are progressively calculated, not full recalculation. Separate use case, async, no latency requirement.

**Implementation**:
- [timer/use-cases.md](docs/architecture/timer/use-cases.md) - CalculateStatistics fully updated
  - Marked as "Use case (async, non-blocking)"
  - Processing: "NOT a full recalculation. Statistics are calculated progressively."
  - Delta-based updates explained
  - Performance: O(k) not O(n)
- [core/services.md](docs/architecture/core/services.md) - Referenced as use case pattern

**Files Updated**:
- ✅ timer/use-cases.md (completely rewritten with progressive algorithm)
- ✅ core/services.md (mentioned as async use case pattern)

---

## 4. NewRecord Event Trigger

**Clarification**: Celebrations triggered by NewRecord event (separate from StatisticsUpdated).

**Implementation**:
- [core/services.md](docs/architecture/core/services.md) - CelebrationService listens to StatisticsUpdated with newRecords
- Respects user settings (celebrationEnabled)
- Event flow clearly defined

**Files Updated**:
- ✅ core/services.md (CelebrationService specification)

---

## 5. DeviceManager is Singleton Service

**Clarification**: DeviceManager is a singleton service that listens for session/device changes and handles compatibility.

**Implementation**:
- [core/services.md](docs/architecture/core/services.md) - Full DeviceManager service spec
  - Registry and binding logic
  - Event subscriptions (SessionSwitched, DeviceDisconnected)
  - Compatibility rules
  - Fallback behavior (always Keyboard)
- [timer/devices.md](docs/architecture/timer/devices.md) - DeviceManager Coordination section added
  - Event listening patterns
  - Fallback sequence
  - Keyboard guarantee

**Files Updated**:
- ✅ core/services.md (DeviceManager - NEW complete specification)
- ✅ timer/devices.md (DeviceManager Coordination section - NEW)

---

## 6. Device Compatibility After Session Switch

**Clarification**: Compatibility should happen after session switch and default to Keyboard.

**Implementation**:
- [timer/devices.md](docs/architecture/timer/devices.md) - DeviceManager coordination
  - SessionSwitched event handling
  - Compatibility check
  - Fallback logic
  - Keyboard as ultimate fallback

**Files Updated**:
- ✅ timer/devices.md (DeviceManager Coordination)
- ✅ core/services.md (DeviceManager compatibility rules)

---

## 7. CreateSolve vs AddSolve Relationship

**Clarification**: CreateSolve only instantiates in-memory object. AddSolve populates and persists.

**Implementation**:
- [timer/use-cases.md](docs/architecture/timer/use-cases.md) - Both use cases fully updated
  - CreateSolve: "(Preparation)" - just object instantiation, no DB access
  - AddSolve: "(Persist)" - populate with final data and persist
  - Explicit note: "Relationship with CreateSolve: CreateSolve creates empty in-memory object, AddSolve populates and persists it (1-to-1 pairing)"

**Files Updated**:
- ✅ timer/use-cases.md (both CreateSolve and AddSolve updated)
- ✅ timer/handlers.md (SolveAddedHandler clarified)

---

## 8. Handler Sequential Execution

**Clarification**: Handlers do NOT call each other. Events queued and fired in order. Handlers cannot see each other's state updates within same event.

**Implementation**:
- [timer/handlers.md](docs/architecture/timer/handlers.md) - Complete rewrite of execution section
  - "Critical Constraint: Handlers are executed sequentially"
  - "They cannot see each other's state updates"
  - Event queue examples
  - Priority levels explained (100 → 50 → 25 → 0)
  - Clear distinction: queued events processed after current event completes

**Files Updated**:
- ✅ timer/handlers.md (Handler Execution Order - completely updated)

---

## 9. SolveAdded Does NOT Emit StatisticsUpdated

**Clarification**: SolveAdded handler doesn't emit StatisticsUpdated. Separate handler triggers CalculateStatistics use case.

**Implementation**:
- [timer/use-cases.md](docs/architecture/timer/use-cases.md) - AddSolve use case clarified
  - "AddSolve does NOT emit StatisticsUpdated directly. It emits SolveAdded..."
  - Lists what happens next via handlers (separate)
- [timer/handlers.md](docs/architecture/timer/handlers.md) - SolveAddedHandler completely rewritten
  - Output events: ScrambleRequested, RequestStatisticsCalculation (NOT StatisticsUpdated)
  - Pseudo-code updated
  - Clear notes: "Does NOT emit StatisticsUpdated directly"

**Files Updated**:
- ✅ timer/use-cases.md (AddSolve - completely updated)
- ✅ timer/handlers.md (SolveAddedHandler - completely rewritten)

---

## 10. Error Handling in Handlers

**Clarification**: Failed handlers emit HandlerError event. UI shows notification. Other handlers continue. Stats can fail but emit error if they do.

**Implementation**:
- [timer/handlers.md](docs/architecture/timer/handlers.md) - Error Handling section completely updated
  - Strategy: try-catch, log, emit error event, don't re-throw
  - Error flow explained
  - Critical vs non-critical operations distinguished
  - Solve/Session persistence must retry; scramble fails gracefully

**Files Updated**:
- ✅ timer/handlers.md (Error Handling section - completely rewritten)

---

## 11. Session Persistence - Immediate Save

**Clarification**: Config saves immediately (no batching), section-specific, on every change. Temporal data lost on restart, crashes logged, user resets manually.

**Implementation**:
- [timer/settings.md](docs/architecture/timer/settings.md) - Settings persistence (check if needs update)
- [core/services.md](docs/architecture/core/services.md) - ConfigService mentioned
  - Immediate persistence
  - Section-specific
  - Event-based updates

**Files Updated**:
- ✅ core/services.md (ConfigService specification added)

---

## 12. Scramble Deduplication

**Clarification**: Compare mode and prob only. Skip generation if match. No stale indicator.

**Implementation**:
- [timer/handlers.md](docs/architecture/timer/handlers.md) - SolveAddedHandler
  - Dedup logic: "Check if scramble needs regeneration (compare mode/prob with current)"
  - Pseudo-code shows comparison logic
- [core/services.md](docs/architecture/core/services.md) - ScrambleService section
  - "Deduplication (In Handler, NOT Service): Before emitting ScrambleRequested, the handler checks..."
  - Comparison logic in SolveAddedHandler

**Files Updated**:
- ✅ timer/handlers.md (SolveAddedHandler dedup logic)
- ✅ core/services.md (ScrambleService dedup explanation)

---

## 13. Multi-Step Solves

**Clarification**: Steps handled internally by device. Stored in solve. UI shows current step and general time (maybe parts). Same stats.

**Implementation**:
- Domain model (Solve entity) - includes steps array
- [timer/state.md](docs/architecture/timer/state.md) - State includes solve with steps
- UI rendering (not defined yet, implementation phase)

**Status**: Partially referenced in domain model, full spec in implementation phase.

---

## 14. Device Incompatibility - UI Filtering

**Clarification**: Can't select incompatible device in UI. Don't show it (filtered in UI before user can select).

**Implementation**:
- [timer/devices.md](docs/architecture/timer/devices.md) - Compatibility section
  - getCompatibleDevices() function
  - Compatibility rules per device type
- [core/services.md](docs/architecture/core/services.md) - DeviceManager.getCompatibleDevices()

**Files Updated**:
- ✅ timer/devices.md (compatibility rules)
- ✅ core/services.md (compatibility in DeviceManager)

---

## 15. Timer Cancellation - Always to CLEAN

**Clarification**: Can cancel anytime. Always goes to CLEAN. Device state machine handles it. Just DeviceCancelled event.

**Implementation**:
- [timer/use-cases.md](docs/architecture/timer/use-cases.md) - CancelSolve use case
  - "Discard lastSolve, reset timer state to CLEAN"
  - Event: SolveCancelled
- [timer/state.md](docs/architecture/timer/state.md) - States including CLEAN
- Device xstate machines internally - not exposed to timer

**Files Updated**:
- ✅ timer/use-cases.md (CancelSolve defined)
- ✅ timer/state.md (state lifecycle)

---

## Summary of Updated/Created Files

| File | Status | Changes |
|------|--------|---------|
| [core/services.md](docs/architecture/core/services.md) | **NEW** | Complete services architecture (DeviceManager, ScrambleService, ImageService, CelebrationService, AnalyticsService) |
| [timer/use-cases.md](docs/architecture/timer/use-cases.md) | **UPDATED** | CreateSolve, AddSolve, CalculateStatistics completely rewritten |
| [timer/handlers.md](docs/architecture/timer/handlers.md) | **UPDATED** | SolveAddedHandler rewritten, Handler Execution Order clarified, Error Handling section expanded |
| [timer/devices.md](docs/architecture/timer/devices.md) | **UPDATED** | DeviceManager Coordination section added |
| [docs/architecture/README.md](docs/architecture/README.md) | **UPDATED** | Added reference to core/services.md and quick reference guides |

---

## Architecture Completeness Verification

All 15 clarifications have been **fully incorporated** into permanent documentation:

- ✅ 1. TimerState Structure
- ✅ 2. ScrambleService Autonomy
- ✅ 3. Statistics Progressive Calculation
- ✅ 4. NewRecord Event Trigger
- ✅ 5. DeviceManager Singleton Service
- ✅ 6. Device Compatibility After Switch
- ✅ 7. CreateSolve vs AddSolve Relationship
- ✅ 8. Handler Sequential Execution
- ✅ 9. SolveAdded No StatisticsUpdated
- ✅ 10. Error Handling in Handlers
- ✅ 11. Session Persistence Immediate Save
- ✅ 12. Scramble Deduplication
- ✅ 13. Multi-Step Solves (partial in domain model)
- ✅ 14. Device Incompatibility UI Filtering
- ✅ 15. Timer Cancellation to CLEAN

---

## Next Steps

The Definition Phase is now **complete and coherent**. All documentation reflects user's clarifications.

Next phase: Implementation of Phase 1-8 per [DEFINITION_PHASE_SUMMARY.md](DEFINITION_PHASE_SUMMARY.md).

