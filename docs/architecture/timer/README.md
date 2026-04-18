# Timer & Devices: Event-Driven Architecture

## Core Principle

```
Device (XState) ── notifies ──▶ EventBus ──▶ Timer (reacts, displays, saves)
```

- The **device** is the flow authority. Controls transitions, inspection, prevention, timing.
- The **Timer** is a reactor. Listens to notifications and executes side effects.
- The **EventBus** carries typed domain events. Does not carry high-frequency data.
- The **time** (stopwatch/countdown) travels through a direct channel (callback), not through EventBus.

## State Flow

```
CLEAN → PREVENTION → READY → INSPECTION → RUNNING → STOPPED
                                                 ↕
                                               PAUSE
```

- **CLEAN**: initial state, no activity.
- **PREVENTION**: user is holding down (hold). Device detail, Timer only displays.
- **READY**: prevention finished. The device can proceed to the next step.
- **INSPECTION**: inspection countdown (if applicable). The device controls it.
- **RUNNING**: stopwatch running.
- **PAUSE**: stopwatch frozen (only some devices support this).
- **STOPPED**: solve finished. Timer saves, calculates, generates scramble.

### `ready` Flag vs READY State

These are distinct concepts:

- **READY (state)**: XState machine state of the device, between PREVENTION and INSPECTION.
  Indicates that prevention finished and it can proceed.
- **`ready` (flag)**: visual indicator ("green light") that activates **just before RUNNING**.
  The UI uses it to show the green color. Deactivates when entering RUNNING or when cancelling.
  - Without inspection: activates when leaving READY (immediately before RUNNING).
  - With inspection: activates when the user presses space during INSPECTION
    (indicating they're about to start). Does not activate in the READY state.

### Flow per Device

Not all devices go through all states:
- **Keyboard**: CLEAN → PREVENTION → READY → [INSPECTION →] RUNNING → STOPPED
- **Stackmat**: CLEAN → RUNNING → STOPPED (hardware controls everything)
- **Manual**: CLEAN → STOPPED (direct time entry)
- **Virtual**: CLEAN → RUNNING → STOPPED (first move starts)
- **GAN**: CLEAN → RUNNING → STOPPED (similar to virtual)

## Responsibilities

| Component | Does | Does NOT |
|---|---|---|
| **Device** | Controls the state flow. Measures time. Handles inspection/prevention. Emits events to EventBus. | Save solves. Modify scramble. Calculate stats. Write to Timer stores (except time via callback). |
| **Timer** | Reacts to events. Updates the UI. Saves solves to DB. Calculates statistics. Generates scrambles. Emits celebrations. | Decide state transitions. Control the solve flow. Know hardware details. |
| **EventBus** | Carries typed events between components. | Business logic. Store state. Carry high-frequency data. |

## Data Access

```
Device can READ (via TimerReadonlyView):
  ├── scramble         → to display or send to hardware
  ├── session.settings → to know if there's inspection, prevention, steps, etc.
  └── state            → to synchronize if needed

Device can WRITE (via direct channels):
  └── time             → via onTimeUpdate callback (high frequency)

Device EMITS (via EventBus):
  └── Domain events (DeviceStopped, DeviceReady, etc.)

Timer REACTS (via EventBus subscriptions):
  ├── Updates internal stores (timerState, ready, solves, stats, etc.)
  ├── Saves to DB
  ├── Generates scrambles
  └── Emits output events (SolveAdded, NewRecord, etc.)
```

## Documents

- [events.md](events.md) - All event definitions
- [devices.md](devices.md) - Device binding, interfaces, XState, sequence diagrams
- [reactor.md](reactor.md) - Timer reactor pseudocode
- [sessions.md](sessions.md) - Session switching
- [solves.md](solves.md) - Solve CRUD
- [statistics.md](statistics.md) - Statistics calculation rules, averages, DNF handling
- [scramble.md](scramble.md) - ScrambleService, fallback system, preview images
- [settings.md](settings.md) - Session settings vs app config
- [state.md](state.md) - State management: EventBus vs $state vs context
- [migration.md](migration.md) - Migration order
