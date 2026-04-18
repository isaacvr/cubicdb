# Timer & Device Use Cases

This document specifies all use cases related to the timer, devices, sessions, and solves.

---

## Solve Use Cases

### CreateSolve (Preparation)

**Trigger**: `DeviceReady` event from device.

**Inputs**: Current session, device ID.

**Processing**:
1. Create a new empty in-memory `Solve` object
2. Set `createdAt = now()`
3. Store in memory only (not persisted)
4. Return the Solve object

**Output**: Solve object (in-memory, not yet persisted).

**Event**: No event emitted (internal preparation).

**Note**: This is just object instantiation. Data (time, penalty) is added later. No database access here.

---

### AddSolve (Persist)

**Trigger**: `DeviceStopped` event from device, after device xstate machine has stopped the timer.

**Inputs**:
- Current `lastSolve` from `TimerState` (created by CreateSolve)
- Final time from DeviceStopped event
- Session settings (for mode, prob, group, etc.)

**Processing**:
1. Populate `lastSolve` with final data:
   - Set `time` from event
   - Apply any penalties from device events
   - Set `solvedAt = now()`
2. Validate solve is valid (time > 0, etc.)
3. Call `ISolveRepository.add(lastSolve)` — **persists to DB**
4. Clear `lastSolve` from memory (ready for next solve)
5. Emit `SolveAdded` event with the persisted solve
6. Emit `ScrambleRequested` for next scramble

**Output Event**:
```ts
export class SolveAdded implements DomainEvent {
  readonly type = 'SolveAdded';
  constructor(public readonly solve: Solve) {}
}
```

**What Happens Next** (via handlers, NOT from AddSolve):
- `StatisticsHandler` listens to SolveAdded → triggers CalculateStatistics use case
- `ScrambleService` listens to SolveAdded → generates next scramble (or deduplicates)
- `AnalyticsService` logs the solve

**Important**: AddSolve does NOT emit `StatisticsUpdated` directly. It emits `SolveAdded`, and then a separate handler triggers statistics calculation.

**Relationship with CreateSolve**:
- `CreateSolve`: Creates empty in-memory object (just instantiation)
- `AddSolve`: Populates the object and persists it (1-to-1 pairing in a solve sequence)

---

### UpdateSolve

**Trigger**: 
- User edits penalty
- User edits comments
- Admin modifies any field

**Inputs**:
- Solve ID
- Updated fields

**Processing**:
1. Load solve from `ISolveRepository.get(id)`
2. Update specified fields
3. Validate updated solve
4. Save via `ISolveRepository.update(solve)`
5. Emit event with before/after

**Output Event**:
```ts
export class SolveUpdated implements DomainEvent {
  readonly type = 'SolveUpdated';
  constructor(
    public readonly previousSolve: Solve,
    public readonly updatedSolve: Solve,
  ) {}
}
```

**Validation Rules** (penalty editing):

| Current | Can change to | Reason |
|---------|---------------|--------|
| NONE | P2, DNF | User choice |
| P2 (manual) | NONE, DNF | User choice |
| DNF (manual) | NONE, P2 | User choice |
| P2 (inspection) | DNF only | Inspection P2 can become DNF if inspection actually expired |
| DNF (inspection) | Not editable | Definitive |

---

### RemoveSolves (Batch Delete)

**Trigger**: User selects solves and deletes.

**Inputs**:
- List of solve IDs
- Session ID

**Processing**:
1. Load all solves
2. Validate all belong to session
3. Ask for confirmation
4. Delete all via `ISolveRepository.remove(solves)`
5. Emit event with list

**Output Event**:
```ts
export class SolvesRemoved implements DomainEvent {
  readonly type = 'SolvesRemoved';
  constructor(
    public readonly solveIds: string[],
    public readonly count: number,
  ) {}
}
```

**Handlers**:
- StatisticsHandler: recalculate
- AnalyticsService: track deletion

---

### GetSolves

**Trigger**: Session switched, UI mounted, user requests history.

**Inputs**:
- Session ID
- Optional filters: date range, penalty, time range
- Optional pagination

**Processing**:
1. Query `ISolveRepository.getBySolver(sessionId, filters)`
2. Return sorted by date (descending)

**Output**: List of solves. No event (read-only).

---

### SelectSolve

**Trigger**: User clicks on a solve in history.

**Inputs**: Solve ID.

**Processing**:
1. Load solve
2. Emit event

**Output Event**:
```ts
export class SolveSelected implements DomainEvent {
  readonly type = 'SolveSelected';
  constructor(public readonly solve: Solve) {}
}
```

**Handlers**:
- UI updates detail panel
- Show reconstruction if available
- Highlight in stats

---

## Session Use Cases

### CreateSession

**Trigger**: User clicks "New Session" or app detects no sessions.

**Inputs**: Session name (optional), puzzle mode, session type.

**Processing**:
1. Generate new ID
2. Create `Session` object with default settings
3. Call `ISessionRepository.add(session)`
4. Emit event

**Output Event**:
```ts
export class SessionCreated implements DomainEvent {
  readonly type = 'SessionCreated';
  constructor(public readonly session: Session) {}
}
```

**Handlers**:
- StatisticsHandler: initialize empty statistics
- UI: add to session list

---

### SwitchSession

**Trigger**: User selects a session from the list.

**Inputs**: Target session ID.

**Validation**:
1. Timer must be in CLEAN state (not during a solve)
2. If not CLEAN, cancel current solve first

**Processing**:
1. Load target session
2. Compare device compatibility
3. If device changed, call `DeviceManager.switchDevice()`
4. Compare scramble configuration (mode, prob, group)
5. If changed, flag for regeneration
6. Update `$state.currentSession`
7. Emit event

**Output Event**:
```ts
export class SessionSwitched implements DomainEvent {
  readonly type = 'SessionSwitched';
  constructor(
    public readonly previousSessionId: string | null,
    public readonly newSessionId: string,
  ) {}
}
```

**Handlers**:
- StatisticsHandler: load stats for new session
- ScrambleService: regenerate if needed
- DeviceManager: bind new device if needed
- SettingsHandler: apply session settings

---

### UpdateSession

**Trigger**: User edits session settings (name, hasInspection, etc).

**Inputs**:
- Session ID
- Updated fields

**Processing**:
1. Load session
2. Update fields
3. Call `ISessionRepository.update(session)`
4. Emit event with affected settings

**Output Event**:
```ts
export class SessionUpdated implements DomainEvent {
  readonly type = 'SessionUpdated';
  constructor(
    public readonly previousSession: Session,
    public readonly updatedSession: Session,
  ) {}
}
```

**Handlers**:
- UI: refresh session list if name changed
- Device: reads new settings lazily on next solve
- Timer: applies any state-affecting changes

---

### RemoveSession

**Trigger**: User deletes a session.

**Inputs**: Session ID.

**Validation**:
1. Cannot delete if it's the currently active session
2. Must have at least one session (create new empty one if deleting the last)

**Processing**:
1. Optionally ask: "Also delete solves in this session?"
2. If yes: `ISolveRepository.removeBySolver(sessionId)`
3. Call `ISessionRepository.remove(sessionId)`
4. Emit event

**Output Event**:
```ts
export class SessionDeleted implements DomainEvent {
  readonly type = 'SessionDeleted';
  constructor(
    public readonly sessionId: string,
    public readonly solveCount: number,
  ) {}
}
```

**Handlers**:
- StatisticsHandler: forget stats for this session
- UI: remove from session list, switch to another session

---

### SelectSession

**Trigger**: Programmatic selection (not user interaction, for grouping/filtering).

**Inputs**: Session ID.

**Processing**:
1. Mark session as selected for filtering views

**Output Event**:
```ts
export class SessionSelected implements DomainEvent {
  readonly type = 'SessionSelected';
  constructor(public readonly sessionId: string) {}
}
```

---

### ApplySessionSettings

**Trigger**: User changes a setting in the session editor.

**Inputs**:
- Session ID
- Setting key and new value

**Processing**:
1. Load session
2. Validate new value
3. Update `session.settings[key]`
4. Persist via `ISessionRepository.update()`
5. Emit event with the specific setting changed

**Output Event**:
```ts
export class SessionSettingsChanged implements DomainEvent {
  readonly type = 'SessionSettingsChanged';
  constructor(
    public readonly sessionId: string,
    public readonly changedKeys: string[],
    public readonly newSettings: Partial<SessionSettings>,
  ) {}
}
```

**Handlers**:
- Device: reads new settings lazily
- Timer: applies immediate settings (e.g., showElapsedTime)
- ScrambleService: if genImage changed, regenerate

---

## Device Use Cases

### DiscoverDevices

**Trigger**: User opens device settings or clicks "Refresh devices".

**Inputs**: Device type filter (optional).

**Processing**:
1. Call `IDeviceDiscovery.scan(filter)`
2. Platform-specific: BLE scan, audio detection, USB enumeration
3. Emit events for each discovered device

**Output Events** (multiple):
```ts
export class DeviceDiscovered implements DomainEvent {
  readonly type = 'DeviceDiscovered';
  constructor(public readonly device: IDiscoveredDevice) {}
}
```

---

### ConnectDevice

**Trigger**: User selects a device from the discovered list.

**Inputs**: Device ID, device type.

**Processing**:
1. Validate device exists and is discoverable
2. Attempt connection (BLE pairing, audio permission, etc)
3. If successful: instantiate device object and call `device.init()`
4. Emit event

**Output Event**:
```ts
export class DeviceConnected implements DomainEvent {
  readonly type = 'DeviceConnected';
  constructor(
    public readonly deviceId: string,
    public readonly deviceType: DeviceType,
  ) {}
}
```

---

### SelectDevice

**Trigger**: User selects a device as preferred for current session.

**Inputs**:
- Device ID
- Session ID

**Processing**:
1. Check compatibility with session
2. If current device is different, call previous device's `unbind()`
3. Call new device's `bind(session, readonlyView, onTimeUpdate)`
4. Update `session.settings.input = deviceId`
5. Emit event

**Output Event**:
```ts
export class ActiveDeviceChanged implements DomainEvent {
  readonly type = 'ActiveDeviceChanged';
  constructor(
    public readonly previousDeviceId: string | null,
    public readonly newDeviceId: string,
    public readonly sessionId: string,
  ) {}
}
```

---

### DisconnectDevice

**Trigger**: Hardware disconnect, user manual disconnect, app shutdown.

**Inputs**: Device ID, reason.

**Processing**:
1. Call device's `unbind()` if active
2. Clean up resources
3. Emit event

**Output Event**:
```ts
export class DeviceDisconnected implements DomainEvent {
  readonly type = 'DeviceDisconnected';
  constructor(
    public readonly deviceId: string,
    public readonly reason: 'user' | 'hardware_error' | 'timeout' | 'battery',
  ) {}
}
```

---

## Statistics Use Cases

### CalculateStatistics

**Trigger**: `SolveAdded`, `SolveUpdated`, `SolvesRemoved`, `SessionSwitched` events.

**Type**: Use case (async, non-blocking).

**Inputs**: Session ID, trigger event (to determine what changed).

**Processing**:

This is **NOT a full recalculation**. Statistics are calculated **progressively**.

1. Get previous statistics from state
2. Based on trigger event, determine what changed:
   - `SolveAdded(solve)`: Add new solve to calculations
   - `SolveUpdated(prev, curr)`: Remove prev metrics, add curr metrics
   - `SolvesRemoved(ids)`: Remove those solves from metrics
   - `SessionSwitched()`: Full load (initial statistics for session)
3. Apply delta to metrics:
   - Update singles: best, worst, count, avg, deviation
   - Update penalty counts: NP, P2, DNF, DNS
   - Update averages: Mo3, Ao5, Ao12, Ao50, Ao100
4. Compare current best with previous: track `newRecords` (if any)
5. Emit event with all statistics and new records
6. Store in state for fast next update

**Output Event**:
```ts
export class StatisticsUpdated implements DomainEvent {
  readonly type = 'StatisticsUpdated';
  constructor(
    public readonly sessionId: string,
    public readonly statistics: SessionStatistics,
    public readonly newRecords?: Array<{
      metric: string; // 'best', 'worst', 'mo3', etc.
      previous: number;
      current: number;
    }>,
  ) {}
}
```

**Algorithm**: See [statistics.md](statistics.md)

**Performance**: O(k) where k is averages window size (not O(n) where n is all solves)

---

## Scramble Use Cases

### RequestScramble

**Trigger**: `DeviceReady`, `DeviceStopped`, `SessionSwitched` events.

**Inputs**:
- Session settings (mode, prob, group, steps)
- Optionally: previous scramble (for deduplication)

**Processing**:
1. Call `ScrambleService.generate(settings)`
2. Service tries each generator in sequence
3. If all fail, use fallback scramble
4. Generate preview image if `genImage=true`
5. Emit event

**Output Event**:
```ts
export class ScrambleGenerated implements DomainEvent {
  readonly type = 'ScrambleGenerated';
  constructor(
    public readonly scramble: string,
    public readonly mode: string,
    public readonly imageUrl?: string,
  ) {}
}
```

**Error Handling**:
```ts
export class ScrambleGenerationFailed implements DomainEvent {
  readonly type = 'ScrambleGenerationFailed';
  constructor(
    public readonly mode: string,
    public readonly reason: string,
  ) {}
}
```

---

## Penalty Use Cases

### ApplyPenalty

**Trigger**: `DeviceDNF`, `DevicePenaltyApplied` events from device.

**Inputs**: Penalty type, reason (inspection, manual, etc).

**Processing**:
1. Update `lastSolve.penalty`
2. Record penalty source
3. Emit event

**Output Event**:
```ts
export class PenaltyApplied implements DomainEvent {
  readonly type = 'PenaltyApplied';
  constructor(
    public readonly penalty: Penalty,
    public readonly source: 'inspection' | 'manual' | 'device',
  ) {}
}
```

---

### ChangePenalty

**Trigger**: User clicks penalty button in UI.

**Inputs**: Solve ID, new penalty.

**Processing**:
1. Validate penalty is editable (see rules in UpdateSolve)
2. Call `UpdateSolve` with updated penalty
3. Recalculate statistics

**Output**: `SolveUpdated` event (handled by StatisticsHandler).

---

## Timer State Use Cases

### ResetTimer

**Trigger**: User clicks reset, or app initialization.

**Inputs**: None.

**Processing**:
1. Reset all timer state to defaults
2. Emit event

**Output Event**:
```ts
export class TimerReset implements DomainEvent {
  readonly type = 'TimerReset';
  readonly timestamp = Date.now();
}
```

---

### CancelSolve

**Trigger**: User presses Escape, device disconnects during solve.

**Inputs**: Reason (user, device_disconnect, etc).

**Processing**:
1. Discard `lastSolve` (don't persist)
2. Reset timer state to CLEAN
3. Emit event

**Output Event**:
```ts
export class SolveCancelled implements DomainEvent {
  readonly type = 'SolveCancelled';
  constructor(
    public readonly reason: 'user' | 'device_disconnect' | 'error',
  ) {}
}
```

---

## Cross-Cutting Use Cases

### PersistConfig

**Trigger**: Any configuration change (theme, language, etc).

**Inputs**: Key-value pairs.

**Processing**:
1. Update `IConfigRepository`
2. Emit event

**Output Event**:
```ts
export class ConfigUpdated implements DomainEvent {
  readonly type = 'ConfigUpdated';
  constructor(
    public readonly keys: string[],
  ) {}
}
```

---

## Use Case Dependency Graph

```
RequestScramble
  └─ ScrambleService (requires Session mode/prob/group)

CreateSolve
  └─ Session (current session)

AddSolve
  ├─ CreateSolve
  ├─ ISolveRepository.add()
  └─ CalculateStatistics

UpdateSolve
  ├─ ISolveRepository.get()
  ├─ ISolveRepository.update()
  └─ CalculateStatistics

RemoveSolves
  ├─ ISolveRepository.remove()
  └─ CalculateStatistics

SwitchSession
  ├─ ISessionRepository.get()
  ├─ SelectDevice (if device changed)
  ├─ RequestScramble (if settings changed)
  └─ CalculateStatistics

ApplySessionSettings
  ├─ ISessionRepository.update()
  └─ RequestScramble (if genImage or mode changed)

ConnectDevice
  └─ IDeviceDiscovery.scan()

SelectDevice
  ├─ IDevice.bind()
  └─ ActiveDeviceChanged event

CalculateStatistics
  └─ ISolveRepository.getBySolver()
```

