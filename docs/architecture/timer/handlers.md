# Event Handlers Architecture

This document specifies all handlers that subscribe to domain events and execute logic.

Handlers are **reactive**. When an event arrives on the EventBus, subscribed handlers execute.
They may trigger use cases, update state, or perform side effects.

---

## Handler Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Reactor Handlers** | Core business logic, persisting state | SolveAddedHandler, SessionSwitchedHandler |
| **Statistics Handlers** | Recalculate metrics | SolveAddedHandler, SolvesRemovedHandler |
| **Service Handlers** | Trigger external operations | ScrambleRequestHandler, CelebrationHandler |
| **UI Handlers** | Update visual state | UpdateStatisticsDisplayHandler |
| **Persistence Handlers** | Write to storage | ApplySessionSettingsHandler |

---

## Solve Handlers

### Handler: SolveAdded

**Event**: `SolveAdded`

**Subscriptions**:
- Subscribes to: `SolveAdded`

**Process**:
1. Receive solve with final time and penalty
2. Update `$state.solves[]` (append to list)
3. Update `$state.lastSolve = solve`
4. Check if scramble needs regeneration (compare mode/prob with current)
5. If scramble changed: emit `ScrambleRequested`
6. Emit `RequestStatisticsCalculation` to trigger CalculateStatistics use case

**Output Events**:
- `ScrambleRequested` (if mode/prob changed, or first solve in session)
- `RequestStatisticsCalculation` (separate use case will handle recalculation)

**Important Notes**:
- Does NOT emit `StatisticsUpdated` directly
- Statistics calculation is triggered as a separate async use case
- Scramble deduplication: compare mode and prob only; skip generation if match
- If all solves are removed, scramble keeps the current one

**Pseudo-code**:
```ts
eventBus.subscribe(SolveAdded, async (event) => {
  const { solve } = event;
  
  // Update state
  state.solves = [...state.solves, solve];
  state.lastSolve = solve;
  
  // Check if scramble needs regeneration
  const currentMode = state.session.settings.mode;
  const currentProb = state.session.settings.prob;
  const previousMode = /* from previous solve or session default */;
  const previousProb = /* from previous solve or session default */;
  
  if (currentMode !== previousMode || currentProb !== previousProb) {
    // Request new scramble
    await eventBus.emit(new ScrambleRequested(
      state.session._id,
      currentMode,
      currentProb,
      state.session.settings.group,
      generateId() // requestId for tracking
    ));
  }
  
  // Trigger statistics calculation (async, separate)
  await eventBus.emit(new RequestStatisticsCalculation(state.session._id, event));
});
```

---

### Handler: SolveUpdated

**Event**: `SolveUpdated`

**Subscriptions**:
- Subscribes to: `SolveUpdated`

**Process**:
1. Replace solve in `$state.solves[]`
2. If `lastSolve`, update it too
3. Recalculate statistics

**Output Events**:
- `StatisticsUpdated`

---

### Handler: SolvesRemoved

**Event**: `SolvesRemoved`

**Subscriptions**:
- Subscribes to: `SolvesRemoved`

**Process**:
1. Remove solves from `$state.solves[]`
2. If any of them was `lastSolve`, clear it
3. Recalculate statistics

**Output Events**:
- `StatisticsUpdated`

---

### Handler: SolveSelected

**Event**: `SolveSelected`

**Subscriptions**:
- Subscribes to: `SolveSelected`

**Process**:
1. Update UI detail panel with solve data
2. If solve has reconstruction comments, show preview button

**Output Events**: None (pure UI).

---

## Session Handlers

### Handler: SessionCreated

**Event**: `SessionCreated`

**Subscriptions**:
- Subscribes to: `SessionCreated`

**Process**:
1. Add session to session list in UI
2. Initialize empty statistics
3. Optionally auto-select if first session

**Output Events**: None.

---

### Handler: SessionSwitched

**Event**: `SessionSwitched`

**Subscriptions**:
- Subscribes to: `SessionSwitched`

**Process**:
1. Update `$state.currentSession`
2. Load statistics for new session
3. Check device compatibility
4. If device must change, emit `DeviceConnectionRequested`
5. Check scramble compatibility
6. If scramble must change, emit `RequestScramble`
7. Reset `$state.timerState = CLEAN`
8. Reset `$state.lastSolve = null`

**Output Events**:
- `StatisticsUpdated` (load stats for new session)
- `RequestScramble` (if needed)
- `DeviceConnectionRequested` (if device changed)
- `ActiveDeviceChanged` (from device handler)

**Pseudo-code**:
```ts
eventBus.subscribe(SessionSwitched, async (event) => {
  const { newSessionId } = event;
  const newSession = await sessionRepo.get(newSessionId);
  
  state.currentSession = newSession;
  state.lastSolve = null;
  state.timerState = TimerState.CLEAN;
  
  // Load stats
  const stats = await calculateStatistics(newSessionId);
  await eventBus.emit(new StatisticsUpdated(newSessionId, stats));
  
  // Check device
  const newDevice = selectDevice(state.activeDevice, newSession);
  if (newDevice.id !== state.activeDevice?.id) {
    await eventBus.emit(new DeviceConnectionRequested(newDevice.id, newDevice.type));
  }
  
  // Check scramble
  const shouldRegenScramble = shouldRegenerateSramble(
    state.currentSession.settings,
    newSession.settings
  );
  if (shouldRegenScramble) {
    await eventBus.emit(new RequestScramble(newSession.settings));
  }
});
```

---

### Handler: SessionUpdated

**Event**: `SessionUpdated`

**Subscriptions**:
- Subscribes to: `SessionUpdated`

**Process**:
1. Update session in `$state`
2. If settings changed that affect device: handle device change
3. If settings changed that affect scramble: regenerate
4. Recalculate statistics if needed

**Output Events**:
- `RequestScramble` (if mode/prob/group changed)
- `StatisticsUpdated` (if calcAoX changed)

---

### Handler: SessionSettingsChanged

**Event**: `SessionSettingsChanged`

**Subscriptions**:
- Subscribes to: `SessionSettingsChanged`

**Process**:
1. Update `$state.currentSession.settings`
2. If specific settings changed:
   - `hasInspection`, `inspection` → Device reads lazily
   - `genImage` → Regenerate current scramble
   - `mode`, `prob`, `group` → Regenerate scramble
   - `calcAoX` → Recalculate statistics
   - `showElapsedTime` → UI updates immediately

**Output Events**:
- `RequestScramble` (if mode/prob/group/genImage changed)
- `StatisticsUpdated` (if calcAoX changed)

---

### Handler: SessionDeleted

**Event**: `SessionDeleted`

**Subscriptions**:
- Subscribes to: `SessionDeleted`

**Process**:
1. Remove from session list UI
2. If deleted session was current, switch to first remaining session
3. If no sessions remain, create a new empty session

**Output Events**:
- `SessionSwitched` (if current session was deleted)

---

## Device Handlers

### Handler: DeviceDiscovered

**Event**: `DeviceDiscovered`

**Subscriptions**:
- Subscribes to: `DeviceDiscovered`

**Process**:
1. Add device to "discovered devices" list in UI
2. Check compatibility with current session
3. Mark as compatible or incompatible in UI

**Output Events**: None.

---

### Handler: DeviceConnected

**Event**: `DeviceConnected`

**Subscriptions**:
- Subscribes to: `DeviceConnected`

**Process**:
1. Update device connection status in UI
2. Add to connected devices list
3. If compatible with current session, optionally auto-select

**Output Events**: None.

---

### Handler: DeviceDisconnected

**Event**: `DeviceDisconnected`

**Subscriptions**:
- Subscribes to: `DeviceDisconnected`

**Process**:
1. Remove from connected devices list
2. Update UI
3. If this was the active device:
   - If timer is active: cancel solve (`DeviceCancelled`)
   - Fallback to Keyboard device
   - Show error notification

**Output Events**:
- `DeviceCancelled` (if solve in progress)
- `ActiveDeviceChanged` (fallback to Keyboard)

**Pseudo-code**:
```ts
eventBus.subscribe(DeviceDisconnected, async (event) => {
  const { deviceId, reason } = event;
  
  if (state.activeDevice?.id === deviceId) {
    // Active device disconnected
    if (state.timerState !== TimerState.CLEAN) {
      // Cancel ongoing solve
      await eventBus.emit(new DeviceCancelled(deviceId));
    }
    
    // Fallback to Keyboard
    const keyboard = getDevice('keyboard');
    await eventBus.emit(new ActiveDeviceChanged(deviceId, keyboard.id, state.currentSession._id));
    
    // Notify user
    showNotification(`Device disconnected: ${reason}`);
  }
});
```

---

### Handler: ActiveDeviceChanged

**Event**: `ActiveDeviceChanged`

**Subscriptions**:
- Subscribes to: `ActiveDeviceChanged`

**Process**:
1. Update `$state.activeDevice`
2. Call new device's `bind()` method
3. Update UI to reflect active device
4. Save preference to config

**Output Events**: None.

---

## Statistics Handlers

### Handler: CalculateStatistics

**Event**: `SolveAdded`, `SolveUpdated`, `SolvesRemoved`, `SessionSwitched`

**Subscriptions**:
- Subscribes to: All events that affect statistics

**Process**:
1. Load all solves for session
2. Apply algorithm from [statistics.md](statistics.md)
3. Compare with previous values to identify improvements
4. Emit `StatisticsUpdated` with new values

**Output Events**:
- `StatisticsUpdated`

---

## Scramble Handlers

### Handler: RequestScramble

**Event**: `DeviceReady`, `SolveAdded`, `SessionSwitched`, `SessionSettingsChanged`

**Subscriptions**:
- Subscribes to: Any event requiring a new scramble

**Process**:
1. Extract session settings
2. Call `ScrambleService.generate()`
3. If `genImage=true`, generate preview image
4. Update `$state.scramble`
5. Emit event

**Output Events**:
- `ScrambleGenerated`
- `ScrambleGenerationFailed` (if all generators fail)

**Algorithm**:
1. Try primary generator (CStimer)
2. If fail: try fallback generator
3. If all fail: use static fallback scramble

**Pseudo-code**:
```ts
eventBus.subscribe(DeviceReady, async (event) => {
  const settings = state.currentSession.settings;
  
  try {
    const scramble = await scrambleService.generate({
      mode: settings.mode,
      prob: settings.prob,
      group: settings.group,
    });
    
    const imageUrl = settings.genImage 
      ? await generatePreviewImage(settings.mode, scramble)
      : undefined;
    
    state.scramble = scramble;
    state.scrambleImage = imageUrl;
    
    await eventBus.emit(new ScrambleGenerated(scramble, settings.mode, imageUrl));
  } catch (error) {
    await eventBus.emit(new ScrambleGenerationFailed(settings.mode, error.message));
    // Use fallback
    state.scramble = FALLBACK_SCRAMBLE[settings.mode];
  }
});
```

---

## Timer State Handlers

### Handler: DeviceEnteredPrevention

**Event**: `DeviceEnteredPrevention`

**Subscriptions**:
- Subscribes to: `DeviceEnteredPrevention`

**Process**:
1. Update `$state.timerState = PREVENTION`
2. Reset time display to 0
3. Enable decimals
4. Deactivate ready flag

---

### Handler: DeviceReady

**Event**: `DeviceReady`

**Subscriptions**:
- Subscribes to: `DeviceReady`

**Process**:
1. Create new `lastSolve` object in memory
2. Trigger scramble generation

**Output Events**:
- `RequestScramble`

---

### Handler: DeviceStartedInspection

**Event**: `DeviceStartedInspection`

**Subscriptions**:
- Subscribes to: `DeviceStartedInspection`

**Process**:
1. Update `$state.timerState = INSPECTION`
2. Disable decimals
3. Start inspection countdown display

---

### Handler: DeviceGreenLight

**Event**: `DeviceGreenLight`

**Subscriptions**:
- Subscribes to: `DeviceGreenLight`

**Process**:
1. Activate `$state.ready = true` (visual green indicator)

---

### Handler: DeviceStartedRunning

**Event**: `DeviceStartedRunning`

**Subscriptions**:
- Subscribes to: `DeviceStartedRunning`

**Process**:
1. Update `$state.timerState = RUNNING`
2. Enable decimals
3. Deactivate ready flag (`$state.ready = false`)

---

### Handler: DeviceStopped

**Event**: `DeviceStopped`

**Subscriptions**:
- Subscribes to: `DeviceStopped`

**Process**:
1. Update `$state.timerState = STOPPED`
2. Set `$state.time = event.time`
3. Trigger `AddSolve` use case (persists to DB)
4. Trigger scramble generation for next solve

**Output Events**:
- `SolveAdded` (from AddSolve use case)
- `RequestScramble`

---

### Handler: DevicePaused

**Event**: `DevicePaused`

**Subscriptions**:
- Subscribes to: `DevicePaused`

**Process**:
1. Update `$state.timerState = PAUSE`

---

### Handler: DeviceResumed

**Event**: `DeviceResumed`

**Subscriptions**:
- Subscribes to: `DeviceResumed`

**Process**:
1. Update `$state.timerState = RUNNING`

---

### Handler: DeviceCancelled

**Event**: `DeviceCancelled`

**Subscriptions**:
- Subscribes to: `DeviceCancelled`

**Process**:
1. Update `$state.timerState = CLEAN`
2. Reset `$state.time = 0`
3. Deactivate ready flag
4. Clear `$state.lastSolve = null`
5. Keep current scramble (optional: regenerate if `scrambleAfterCancel=true`)

**Output Events**:
- `RequestScramble` (if `scrambleAfterCancel=true`)

---

### Handler: DeviceDNF

**Event**: `DeviceDNF`

**Subscriptions**:
- Subscribes to: `DeviceDNF`

**Process**:
1. Set `lastSolve.penalty = Penalty.DNF`
2. Record penalty source: `source = 'inspection'` (if `fromInspection=true`)
3. Trigger `AddSolve` use case

**Output Events**:
- `SolveAdded`

---

## Handler Initialization

All handlers must be initialized at app startup. This typically happens in `+layout.svelte` or in a boot service.

```ts
// In app initialization
export function setupAllHandlers() {
  // Solve handlers
  setupSolveHandlers();
  
  // Session handlers
  setupSessionHandlers();
  
  // Device handlers
  setupDeviceHandlers();
  
  // Statistics handlers
  setupStatisticsHandlers();
  
  // Scramble handlers
  setupScrambleHandlers();
  
  // Timer state handlers
  setupTimerStateHandlers();
}
```

Each handler setup function creates subscriptions. They remain active until app closes.

---

## Handler Execution Order

**Critical Constraint**: Handlers are executed **sequentially in the order events arrive**. They **cannot see each other's state updates** because:
- Events are queued
- Handlers run one at a time
- State updates from handler N are visible only to handler N+1's perspective

This means:
1. Handler A subscribes to `SolveAdded` and updates `state.solves`
2. Handler B subscribes to `SolveAdded` and expects to read `state.solves`
3. If A emits event X during its processing, B does NOT see the effect until X is processed
4. B sees the state as it was when the ORIGINAL event (SolveAdded) arrived

**Execution Model**:
```ts
// Event queue: [SolveAdded, ScrambleRequested, StatisticsUpdated]

// 1. Process SolveAdded
handler_A_solveAdded(); // Updates state.solves
handler_B_statistics_trigger(); // Emits RequestStatisticsCalculation
handler_C_ui_update(); // Uses state as of ORIGINAL SolveAdded, not B's changes

// 2. Process ScrambleRequested (queued by handler_B)
handler_scramble_generation(); // Emits ScrambleGenerated

// 3. Process StatisticsUpdated (queued by use case or service)
handler_statistics_update(); // Final UI update
```

**When Handler Execution Order Matters**:

Use **priorities only** if multiple handlers subscribe to the SAME event and one depends on the other's state update:

```ts
interface EventSubscription {
  priority: number; // higher = earlier
  handler: EventHandler;
}
```

**Priority Levels**:
1. **Core State (100)** - Update `$state` first (e.g., SolveAddedHandler updates solves[])
2. **Business Logic (50)** - Trigger use cases, emit new events (e.g., statistics calculation trigger)
3. **Integrations (25)** - External operations (DB, services)
4. **UI Updates (0)** - Last, after all logic is done

**Example**:
```ts
// Subscriptions to SolveAdded
eventBus.subscribe(SolveAdded, coreStateHandler, { priority: 100 });
eventBus.subscribe(SolveAdded, businessLogicHandler, { priority: 50 });
eventBus.subscribe(SolveAdded, uiUpdateHandler, { priority: 0 });

// Within same event, these execute in order 100 → 50 → 0
// But if businessLogic emits new events, they're queued and processed after this event completes
```

---

## Error Handling in Handlers

**Principle**: Handlers should fail gracefully. If one handler fails, others continue processing.

**Strategy**:

```ts
eventBus.subscribe(SolveAdded, async (event) => {
  try {
    // ... handler logic
    // This might throw or fail
  } catch (error) {
    logger.error('SolveAddedHandler', 'Failed to process solve', { 
      error, 
      event: event 
    });
    
    // Emit error event so UI can notify user
    await eventBus.emit(new HandlerError(
      'SolveAddedHandler', 
      'Failed to save solve',
      error
    ));
    
    // Do NOT re-throw; let other handlers continue
  }
});
```

**Error Flow**:

1. Handler tries operation (e.g., save to DB)
2. Operation fails → catch block executes
3. Log error with context
4. Emit `HandlerError` event (UI handler shows notification)
5. Other handlers continue processing
6. User sees error notification but app continues working

**Important Notes**:

- Statistics handler failures (if any): should emit `HandlerError`, not silently fail
- Penalty validation failures: handlers enforce rules, reject invalid penalties
- Config persistence failures: emit error, allow user to retry
- Scramble generation failures: emit `ScrambleGenerated` with empty scramble (fallback)
- Device connection failures: emit `DeviceDisconnected`, try next compatible device

**When Operations MUST Succeed** (no fallback):

- Solve persistence: must retry and persist (critical data)
- Session persistence: must retry (user data)

If these fail after retries, show user error and ask to contact support.


