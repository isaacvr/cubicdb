# Architecture Documentation

Index of architecture documents for CubicDB.

See also: [Development Guide](../development/README.md) for code conventions, git workflow, testing, and error handling.

## Core Architecture

- [domain-model.md](domain-model.md) - Entity definitions (Solve, Session, Algorithm, etc.)
- [core/result-type.md](core/result-type.md) - Result<T, E> type and error handling patterns
- [core/repository-ports.md](core/repository-ports.md) - All repository interfaces (ISolveRepository, ISessionRepository, etc.)
- [core/services.md](core/services.md) - Service architecture (DeviceManager, ScrambleService, StatisticsService, etc.)

## Data Layer

- [data-layer.md](data-layer.md) - Repositories, services, adapters, environment abstraction

## Timer & Devices

Event-driven architecture for the timer, devices, sessions, and solves.

- [timer/README.md](timer/README.md) - Overview, principles, states, responsibilities
- [timer/use-cases.md](timer/use-cases.md) - All timer-related use cases with detailed specifications
- [timer/handlers.md](timer/handlers.md) - All event handlers with processing logic and dependencies
- [timer/events.md](timer/events.md) - All event definitions (input, output, session, solve)
- [timer/devices.md](timer/devices.md) - Device binding, interfaces, XState, DeviceManager coordination
- [timer/reactor.md](timer/reactor.md) - Timer reactor pseudocode
- [timer/sessions.md](timer/sessions.md) - Session switching rules and flows
- [timer/solves.md](timer/solves.md) - Solve CRUD, penalty editing, deletion flows
- [timer/scramble.md](timer/scramble.md) - ScrambleService, fallback system, preview images
- [timer/settings.md](timer/settings.md) - Session settings vs app config, propagation
- [timer/state.md](timer/state.md) - State management: EventBus vs $state vs context
- [timer/statistics.md](timer/statistics.md) - Statistics calculation rules, averages, DNF handling
- [timer/migration.md](timer/migration.md) - Migration order

## Quick Reference Guides

- [ARCHITECTURE_QUICK_REFERENCE.md](../../ARCHITECTURE_QUICK_REFERENCE.md) - Quick lookup of patterns, event flows, and key decisions
- [DEFINITION_PHASE_SUMMARY.md](../../DEFINITION_PHASE_SUMMARY.md) - Overview of what's defined vs needs implementation
- [DEFINITION_PHASE_DELIVERABLES.md](../../DEFINITION_PHASE_DELIVERABLES.md) - Complete inventory of architecture documentation
