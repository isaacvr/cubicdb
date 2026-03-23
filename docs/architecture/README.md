# Architecture Documentation

Index of architecture documents for CubicDB.

## Timer & Devices

Event-driven architecture for the timer, devices, sessions, and solves.

- [timer/README.md](timer/README.md) - Overview, principles, and states
- [timer/events.md](timer/events.md) - All event definitions (input, output, session, solve)
- [timer/devices.md](timer/devices.md) - Device binding, interfaces, XState diagrams, and per-device sequence diagrams
- [timer/reactor.md](timer/reactor.md) - Timer reactor pseudocode (how Timer reacts to each event)
- [timer/sessions.md](timer/sessions.md) - Session switching rules and flows
- [timer/solves.md](timer/solves.md) - Solve CRUD rules, penalty editing, deletion flows
- [timer/migration.md](timer/migration.md) - Migration order and steps
