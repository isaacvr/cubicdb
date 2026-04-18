# Session Switching

## Rules

1. **Cannot switch sessions while the timer is not in CLEAN.**
   The UI must block the session selector when `timerState !== CLEAN`.
   If the switch is somehow forced, the solve is cancelled (`DeviceCancelled`).

2. **The active device depends on the session.**
   Each session has `settings.input` indicating the preferred device.
   Default is Keyboard. The list of available devices for a session
   is filtered by compatibility (e.g., GAN iCarry doesn't make sense for 4x4).
   When switching sessions:
   - If the new session's device is **the same** as the current one → don't disconnect.
   - If it's **different** → disconnect the current one, connect the new one.

3. **In "mixed" sessions, configuration is persisted automatically.**
   When the user changes group/mode/filter in a mixed session,
   it's saved immediately to `session.settings`.

4. **Deleting the active session**: go to the first session in the list.
   If none remain, create a new empty one. (Preferably, deletion
   happens from the session list, not from the active timer.)

5. **The scramble is kept if configurations match.**
   The scramble depends on: `mode`, `prob`, and potentially `group`.
   If when switching sessions all these configurations are identical,
   the current scramble is kept (no point regenerating an unused one).
   If any differ, a new one is generated.

## Flow: Switch Session

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant D as Device
    participant DB

    U->>UI: selects session B

    alt timerState !== CLEAN
        UI->>UI: blocks action (button disabled)
    else timerState === CLEAN
        UI->>EB: SessionSwitched(prev=A, new=B)

        EB->>T: processes SessionSwitched
        T->>T: saves session A._id in config

        T->>DB: loads solves for session B
        DB-->>T: solves[]

        T->>T: allSolves = solves[], filters by session B
        T->>T: stats = recalculates from scratch

        T->>T: resolves mode/group/prob from B.settings

        alt scramble config changed (mode, prob, group)
            T->>T: generates new scramble
            T->>EB: ScrambleGenerated
        else scramble config unchanged
            Note over T: keeps current scramble
        end

        alt session B device !== current device
            T->>D: disconnect() current device
            T->>D: init(deviceContext) new device
        else device is the same
            Note over T,D: keeps device connected
        end

        T->>EB: TimerStateChanged(CLEAN)
        T->>UI: updates everything
    end
```

## Flow: Create New Session

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: name, type, mode, steps
    UI->>DB: SessionController.addSession(...)
    DB-->>UI: new session with _id

    UI->>EB: SessionSwitched(prev=current, new=newSession)
    Note over T: same flow as switching sessions
    Note over T: solves = [] (empty), stats = initial
```

## Flow: Delete Active Session

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: delete active session
    UI->>UI: confirmation (pending implementation)
    UI->>DB: SessionController.removeSession(session)

    alt sessions remain
        UI->>EB: SessionSwitched(prev=deleted, new=first in list)
    else no sessions remain
        UI->>DB: SessionController.addSession(default empty session)
        UI->>EB: SessionSwitched(prev=deleted, new=new session)
    end
```
