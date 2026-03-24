# Architecture Documentation

Index of architecture documents for CubicDB.

See also: [Development Guide](../development/README.md) for code conventions, git workflow, testing, and error handling.

## Timer & Devices

Event-driven architecture for the timer, devices, sessions, and solves.

- [timer/README.md](timer/README.md) - Overview, principles, states, responsibilities
- [timer/events.md](timer/events.md) - All event definitions (input, output, session, solve)
- [timer/devices.md](timer/devices.md) - Device binding, interfaces, XState, sequence diagrams
- [timer/reactor.md](timer/reactor.md) - Timer reactor pseudocode
- [timer/sessions.md](timer/sessions.md) - Session switching rules and flows
- [timer/solves.md](timer/solves.md) - Solve CRUD, penalty editing, deletion flows
- [timer/scramble.md](timer/scramble.md) - ScrambleService, fallback system, preview images
- [timer/settings.md](timer/settings.md) - Session settings vs app config, propagation
- [timer/state.md](timer/state.md) - State management: EventBus vs $state vs context
- [timer/migration.md](timer/migration.md) - Migration order
