# Solve CRUD

## Penalty Editing Rules

Editing rules depend on the **origin** of the penalty:

| Origin | Current penalty | Can change to |
|---|---|---|
| No penalty | NONE | P2, DNF |
| Manual +2 | P2 | NONE, DNF |
| Manual DNF | DNF | NONE, P2 |
| +2 from inspection | P2 | DNF (remove only if accidental) |
| DNF from inspection | DNF | **Not editable** |

Note: the solve must record the penalty origin to enforce these rules.

```ts
/**
 * Penalty info to determine editing rules.
 */
interface PenaltyInfo {
  penalty: Penalty;
  source: 'none' | 'manual' | 'inspection';
}
```

## General Rules

- **Time is not editable** after saving. Can only be added manually (Manual device).
- **Comments** are always editable.
- **Batch deletion**: multiple solves can be selected and deleted. Requires confirmation.
- **Deleting lastSolve**: if the timer is not in CLEAN, force transition to CLEAN
  (emit `DeviceCancelled` if there's a solve in progress).
- **A solve belongs to a single session.** They are not shared between sessions.

## Flow: Edit Penalty

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: changes solve penalty (e.g., NONE → P2)
    UI->>EB: SolvePenaltyChangeRequested(solve, P2)

    EB->>T: validates editing rules
    alt penalty is editable
        T->>T: updates solve.penalty = P2
        T->>DB: SolveRepository.updateSolve(solve)
        T->>T: recalculates stats (incremental from affected solve)
        T->>EB: SolveUpdated(prev, updated)
        EB->>UI: updates list and stats
    else penalty not editable (DNF from inspection)
        T->>EB: emits error/notification
        EB->>UI: shows "penalty not editable" message
    end
```

## Flow: Delete Solves

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant D as Device
    participant DB

    U->>UI: selects solves, presses delete
    UI->>EB: SolveRemovalRequested(solves[])
    EB->>UI: shows confirmation dialog

    alt user confirms
        UI->>EB: SolveRemovalConfirmed(solves[])
        EB->>T: processes deletion

        alt any solve is lastSolve AND timerState !== CLEAN
            T->>D: forces cancellation
            D->>EB: DeviceCancelled
            EB->>T: timerState = CLEAN, time = 0
        end

        T->>DB: SolveRepository.removeSolves(solves)
        T->>T: removes from allSolves[] and solves[]
        T->>T: stats = INITIAL, recalculates from scratch
        T->>EB: SolvesRemoved(solves)
        EB->>UI: updates list and stats
    else user cancels
        Note over UI: does nothing
    end
```

## Flow: Edit Comments

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: edits solve comment
    UI->>T: handleUpdateSolve(solve with new comments)
    T->>DB: SolveRepository.updateSolve(solve)
    T->>EB: SolveUpdated(prev, updated)
    Note over T: Does not recalculate stats (comments don't affect stats)
```

## Statistics Recalculation

```
When to recalculate:
├── SolveAdded       → incremental (only the new solve)
├── SolveUpdated     → from the affected solve's position (if penalty/time changed)
├── SolvesRemoved    → from scratch (INITIAL_STATISTICS)
└── SessionSwitched  → from scratch (new session, new solves)

Future optimization:
  Instead of recalculating everything from INITIAL_STATISTICS on deletion,
  recalculate from the oldest affected solve.
  This requires statistics to be indexable by position.
```
