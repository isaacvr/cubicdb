# Implementation Reading Guide

**For developers implementing the event-driven architecture.**

This guide tells you what to read and in what order to understand the architecture before writing code.

---

## Phase 1: Foundation Understanding (30 mins)

Start here to understand the core philosophy.

1. **[ARCHITECTURE_QUICK_REFERENCE.md](ARCHITECTURE_QUICK_REFERENCE.md)**
   - Quick overview of key patterns and decisions
   - Event flow examples
   - Answers "what is this architecture doing?"

2. **[docs/architecture/README.md](docs/architecture/README.md)**
   - Full index of all documentation
   - Know where to find things

3. **[docs/architecture/timer/README.md](docs/architecture/timer/README.md)**
   - Timer system overview
   - Principles of event-driven architecture
   - State machine concepts

---

## Phase 2: Core Architecture (1 hour)

Understand the mechanisms and patterns used throughout.

4. **[docs/architecture/domain-model.md](docs/architecture/domain-model.md)**
   - All entities (Solve, Session, Algorithm, etc.)
   - What data the system manages

5. **[docs/architecture/core/result-type.md](docs/architecture/core/result-type.md)**
   - Result<T, E> type for error handling
   - How to handle errors safely
   - Used in ALL repositories and use cases

6. **[docs/architecture/core/repository-ports.md](docs/architecture/core/repository-ports.md)**
   - All 8 repository interfaces
   - What persistence operations are needed
   - Error handling in repos

7. **[docs/architecture/data-layer.md](docs/architecture/data-layer.md)**
   - How repositories are implemented
   - Adapter pattern for different platforms (Browser, Electron)
   - Environment abstraction

---

## Phase 3: Event System (45 mins)

How events flow through the system.

8. **[docs/architecture/timer/events.md](docs/architecture/timer/events.md)**
   - All 30+ events defined
   - Event structure and types
   - What events mean

9. **[docs/architecture/timer/state.md](docs/architecture/timer/state.md)**
   - How state is managed with $state
   - EventBus vs $state vs context
   - What lives where

10. **[docs/architecture/core/services.md](docs/architecture/core/services.md)**
    - Services vs handlers distinction
    - DeviceManager, ScrambleService, CelebrationService, etc.
    - How services listen to events and coordinate

---

## Phase 4: Handlers & Use Cases (1 hour)

What happens when events arrive.

11. **[docs/architecture/timer/use-cases.md](docs/architecture/timer/use-cases.md)**
    - All use cases (what work needs to happen)
    - Inputs, outputs, and events
    - Progressive statistics calculation
    - CreateSolve vs AddSolve distinction

12. **[docs/architecture/timer/handlers.md](docs/architecture/timer/handlers.md)**
    - All handlers (how to react to events)
    - Handler execution order (sequential, queued)
    - Error handling in handlers
    - Why SolveAdded doesn't emit StatisticsUpdated

---

## Phase 5: Devices (45 mins)

How devices work in the system.

13. **[docs/architecture/timer/devices.md](docs/architecture/timer/devices.md)**
    - Device interfaces and lifecycle
    - DeviceManager coordination and fallback logic
    - Device-session compatibility
    - Device state machines (internal)

14. **[docs/architecture/core/services.md](docs/architecture/core/services.md) - DeviceManager section**
    - How DeviceManager handles session switches
    - Compatibility checking
    - Fallback to Keyboard

---

## Phase 6: Detailed Flows (30 mins)

Understand complete workflows.

15. **[docs/architecture/timer/sessions.md](docs/architecture/timer/sessions.md)**
    - Session switching flow
    - Settings propagation

16. **[docs/architecture/timer/solves.md](docs/architecture/timer/solves.md)**
    - Complete solve creation and persistence flow
    - Penalty editing rules

17. **[docs/architecture/timer/settings.md](docs/architecture/timer/settings.md)**
    - Session settings vs app config
    - Persistence and propagation

18. **[docs/architecture/timer/statistics.md](docs/architecture/timer/statistics.md)**
    - How statistics are calculated
    - Progressive calculation (not full recalculation)
    - Moving averages rules

19. **[docs/architecture/timer/scramble.md](docs/architecture/timer/scramble.md)**
    - Scramble generation flow
    - Deduplication logic
    - Fallback system

---

## Phase 7: User Clarifications (30 mins)

Understand what the user specifically wants.

20. **[CLARIFICATIONS_INCORPORATED.md](CLARIFICATIONS_INCORPORATED.md)**
    - All 15 clarifications that were made
    - Where they're implemented in docs
    - Specific behavior requirements

---

## Phase 8: Implementation Roadmap (15 mins)

Plan your implementation.

21. **[DEFINITION_PHASE_SUMMARY.md](DEFINITION_PHASE_SUMMARY.md)**
    - What's defined
    - What's not yet implemented
    - Implementation phases (1-8)

22. **[docs/architecture/timer/migration.md](docs/architecture/timer/migration.md)**
    - Implementation order
    - Dependencies between phases

---

## Quick Lookup by Feature

Need to implement something? Use this guide to find the right docs.

### Timer & Time Tracking
- Start: [timer/README.md](docs/architecture/timer/README.md)
- Handling time updates: [timer/state.md](docs/architecture/timer/state.md)
- Events: [timer/events.md](docs/architecture/timer/events.md)

### Devices
- All device docs: [timer/devices.md](docs/architecture/timer/devices.md)
- Device coordination: [core/services.md](docs/architecture/core/services.md) → DeviceManager section
- Compatibility: [timer/devices.md](docs/architecture/timer/devices.md) → Device-Session Compatibility

### Solves
- Creating & persisting: [timer/use-cases.md](docs/architecture/timer/use-cases.md) → CreateSolve, AddSolve
- Editing: [timer/solves.md](docs/architecture/timer/solves.md)
- Event handling: [timer/handlers.md](docs/architecture/timer/handlers.md) → SolveAddedHandler

### Sessions
- Session switching: [timer/sessions.md](docs/architecture/timer/sessions.md)
- Settings: [timer/settings.md](docs/architecture/timer/settings.md)
- Events: [timer/handlers.md](docs/architecture/timer/handlers.md) → SessionSwitchedHandler

### Statistics
- How to calculate: [timer/statistics.md](docs/architecture/timer/statistics.md)
- Use case spec: [timer/use-cases.md](docs/architecture/timer/use-cases.md) → CalculateStatistics
- Progressive calculation: [core/services.md](docs/architecture/core/services.md) or [timer/use-cases.md](docs/architecture/timer/use-cases.md)

### Scrambles
- Generation: [timer/scramble.md](docs/architecture/timer/scramble.md)
- Service spec: [core/services.md](docs/architecture/core/services.md) → ScrambleService
- Use case: [timer/use-cases.md](docs/architecture/timer/use-cases.md) → RequestScramble

### Error Handling
- Result type: [core/result-type.md](docs/architecture/core/result-type.md)
- In handlers: [timer/handlers.md](docs/architecture/timer/handlers.md) → Error Handling section
- In services: [core/services.md](docs/architecture/core/services.md) → all services have error sections

### Persistence
- Repository interfaces: [core/repository-ports.md](docs/architecture/core/repository-ports.md)
- Implementation patterns: [data-layer.md](docs/architecture/data-layer.md)
- Config persistence: [timer/settings.md](docs/architecture/timer/settings.md)

### Event System
- Event definitions: [timer/events.md](docs/architecture/timer/events.md)
- Handler patterns: [timer/handlers.md](docs/architecture/timer/handlers.md)
- Service patterns: [core/services.md](docs/architecture/core/services.md)

---

## Reading Time Estimate

- **Quick overview** (want to understand in 30 mins): ARCHITECTURE_QUICK_REFERENCE.md → docs/architecture/timer/README.md → CLARIFICATIONS_INCORPORATED.md
- **Complete understanding** (want to implement Phase 1): All sections above ≈ **5-6 hours**
- **Reference during implementation**: Use "Quick Lookup by Feature" above

---

## Before You Start Implementing

✅ **Read sections 1-7** to understand the full architecture  
✅ **Review CLARIFICATIONS_INCORPORATED.md** for user's specific requirements  
✅ **Check DEFINITION_PHASE_SUMMARY.md** for implementation phases  
✅ **Use "Quick Lookup" as your guide** while implementing specific features

---

## Key Concepts to Understand

Before writing code, make sure you understand:

1. **Event-driven**: Events are the single source of truth, not function calls
2. **Sequential handlers**: Handlers execute one at a time; they cannot see each other's state changes
3. **Services vs handlers**: Services coordinate operations; handlers react to events
4. **Progressive statistics**: Not recalculated from scratch each time
5. **Device compatibility**: UI filters incompatible devices; DeviceManager falls back to Keyboard
6. **CreateSolve vs AddSolve**: First creates in-memory object, second persists it
7. **Error handling**: Handlers fail gracefully; other handlers continue
8. **Immediate persistence**: Config saved immediately, section-specific

---

## Questions?

If something is unclear, check:
1. **ARCHITECTURE_QUICK_REFERENCE.md** - Quick patterns and examples
2. **CLARIFICATIONS_INCORPORATED.md** - User's specific clarifications
3. The relevant detailed doc in docs/architecture/timer/

