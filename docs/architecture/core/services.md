# Services Architecture

This document defines the core services that listen to events and provide system-level functionality.

Unlike handlers, services are **autonomous** — they listen for events and emit their own results directly.

---

## DeviceManager Service

**Responsibility**: Coordinate device lifecycle, session-device binding, and compatibility.

**Behavior**:

```ts
export interface IDeviceManager {
  // Registry
  registerDevice(device: IDevice): void;
  getDevices(): IDevice[]; // Global list
  getDevice(id: string): IDevice | undefined;
  
  // Session-specific device management
  getDeviceForSession(sessionId: string): IDevice | undefined;
  setDeviceForSession(sessionId: string, deviceId: string): Promise<void>;
  
  // Compatibility
  isCompatible(device: IDevice, session: Session): boolean;
  getCompatibleDevices(session: Session): IDevice[];
  
  // Fallback
  getFallbackDevice(): IDevice; // Always returns Keyboard
}
```

### Event Subscriptions

DeviceManager listens to:

1. **SessionSwitched** event
   - Extract new session ID and get session data
   - Get currently active device
   - Check if active device is compatible with new session
   - If incompatible: fallback to Keyboard
   - Emit `DeviceConnectionRequested(newDeviceId)` if changed
   - Emit `ActiveDeviceChanged` when binding completes

2. **DeviceDisconnected** event
   - If disconnected device is active: emit `ActiveDeviceChanged(Keyboard)`
   - Remove from active device registry

3. **SessionSettingsChanged** event (for device preference)
   - If device preference changed: re-evaluate compatibility
   - If incompatible: mark for review (don't auto-switch)

### Processing Logic

```ts
// Pseudocode
eventBus.subscribe(SessionSwitched, async (event) => {
  const { newSessionId } = event;
  const newSession = await sessionRepo.get(newSessionId);
  
  const currentDevice = deviceManager.getDeviceForSession(newSessionId);
  
  // Check compatibility
  if (currentDevice && !deviceManager.isCompatible(currentDevice, newSession)) {
    // Try to find a compatible device
    const compatible = deviceManager.getCompatibleDevices(newSession);
    
    if (compatible.length === 0) {
      // Fallback to Keyboard
      const keyboard = deviceManager.getFallbackDevice();
      await eventBus.emit(new ActiveDeviceChanged(
        currentDevice?.id || null,
        keyboard.id,
        newSessionId
      ));
    } else {
      // Use first compatible (or preferred if in list)
      const selected = compatible[0];
      await eventBus.emit(new ActiveDeviceChanged(
        currentDevice?.id || null,
        selected.id,
        newSessionId
      ));
    }
  }
});
```

### Compatibility Rules

```ts
isCompatible(device: IDevice, session: Session): boolean {
  const mode = session.settings.mode;
  
  switch (device.type) {
    case 'keyboard':
    case 'manual_entry':
    case 'stackmat':
      return true; // Compatible with any session
    
    case 'gan_icarry':
      return mode === '333'; // Only 3x3
    
    case 'qiyi_smart_timer':
      return true; // Timer, works everywhere
    
    case 'virtual_cube_keyboard':
      return hasSimulator(mode); // Only if simulator exists
    
    default:
      return false;
  }
}
```

### Device Fallback Behavior

**When compatibility check fails**:
1. Find compatible devices for the session
2. If any exist: select first (or preferred)
3. If none: Keyboard is always fallback
4. Emit `ActiveDeviceChanged` with new device

**Keyboard is always available** and compatible with everything.

---

## ScrambleService

**Responsibility**: Generate scrambles on demand, emit results with request tracking.

**Behavior**:

```ts
export interface IScrambleService {
  // Not called directly - listens to events
  // Results emitted to EventBus
}
```

### Event Subscriptions

ScrambleService listens to:

1. **ScrambleRequested** event
   - Extract mode, prob, group from event
   - Extract requestId (for tracking)
   - Call generator (CStimer primary, fallback if fails)
   - Emit `ScrambleGenerated(scramble, requestId)` with result
   - If ALL generators fail: emit `ScrambleGenerated(scramble="", requestId)`

### Processing Logic

```ts
eventBus.subscribe(ScrambleRequested, async (event) => {
  const { mode, prob, group, requestId } = event;
  
  try {
    // Try primary generator
    const scramble = await primaryGenerator.generate({ mode, prob, group });
    
    await eventBus.emit(new ScrambleGenerated(
      scramble,
      mode,
      requestId,
      undefined // image comes from ImageService
    ));
  } catch (error) {
    logger.warn('ScrambleService', `Failed to generate ${mode}`, { error });
    
    // Fallback: empty scramble
    await eventBus.emit(new ScrambleGenerated(
      '',
      mode,
      requestId,
      undefined
    ));
  }
});
```

### Deduplication (In Handler, NOT Service)

Before emitting `ScrambleRequested`, the handler checks:

```ts
// In SolveAdded handler
const currentScramble = state.scramble;
const currentMode = state.session.settings.mode;
const currentProb = state.session.settings.prob;

const newMode = state.session.settings.mode;
const newProb = state.session.settings.prob;

if (currentMode === newMode && currentProb === newProb) {
  // Skip generation, keep current scramble
  return;
}

// Emit request
await eventBus.emit(new ScrambleRequested(
  state.session._id,
  newMode,
  newProb,
  state.session.settings.group
));
```

---

## ImageService

**Responsibility**: Generate preview images for scrambles asynchronously.

**Behavior**:

```ts
export interface IImageService {
  // Not called directly - listens to events
  // Results emitted to EventBus or stored directly
}
```

### Event Subscriptions

ImageService listens to:

1. **ScrambleGenerated** event (with `genImage=true`)
   - Extract scramble, mode, requestId
   - If `genImage` setting is true: generate image asynchronously
   - Emit `ImageGenerated(imageUrl, requestId)` when done
   - Do NOT block the scramble event

### Processing Logic

```ts
eventBus.subscribe(ScrambleGenerated, async (event) => {
  const { scramble, mode, requestId } = event;
  
  // Check if generation is enabled
  const session = await sessionRepo.get(state.session._id);
  if (!session.settings.genImage) {
    return; // Don't generate
  }
  
  // Generate asynchronously (don't wait)
  (async () => {
    try {
      const imageUrl = await generatePreviewImage(mode, scramble);
      
      // Store in cache
      await cacheRepo.set(
        `scramble_image_${requestId}`,
        { imageUrl, type: 'image' }
      );
      
      // Emit result
      await eventBus.emit(new ImageGenerated(imageUrl, requestId));
    } catch (error) {
      logger.warn('ImageService', `Failed to generate image for ${mode}`, { error });
      // Silently fail - UI shows empty image
    }
  })();
});
```

---

## StatisticsService

**Responsibility**: Calculate session statistics progressively.

**This is actually a use case**, not a pure service. It's triggered by handlers and emits events with results.

See `timer/use-cases.md` → **CalculateStatistics** for full specification.

---

## CelebrationService

**Responsibility**: Trigger celebrations when new records occur.

**Behavior**:

```ts
export interface ICelebrationService {
  // Not called directly - listens to events
  // Triggers side effects (animations, sounds)
}
```

### Event Subscriptions

CelebrationService listens to:

1. **StatisticsUpdated** event (with newRecords)
   - Check if newRecords were marked
   - Extract user settings: `celebrationEnabled`
   - If enabled: trigger celebration
   - Play sound/animation/confetti as configured

### Processing Logic

```ts
eventBus.subscribe(StatisticsUpdated, async (event) => {
  const { newRecords } = event;
  
  if (!newRecords || newRecords.length === 0) {
    return; // No records
  }
  
  // Check if user enabled celebrations
  const celebrationEnabled = await configRepo.get('celebrationEnabled', true);
  if (!celebrationEnabled) {
    return; // User disabled
  }
  
  // Trigger celebration
  for (const record of newRecords) {
    logger.info('celebration', `New record! ${record.metric}`, {
      previous: record.previous,
      current: record.current,
    });
    
    // Emit UI event or trigger side effect
    triggerConfetti();
    playSound('celebration');
  }
});
```

---

## AnalyticsService

**Responsibility**: Track user actions and metrics.

**Behavior**:

```ts
export interface IAnalyticsService {
  // Listens to all major events and logs them
}
```

### Event Subscriptions

AnalyticsService listens to:

- `SolveAdded` → log solve time, penalty, device
- `SessionSwitched` → log session switch
- `SessionUpdated` → log setting changes
- `NewRecord` → log records
- `DeviceConnected` → log device connection
- etc.

### Processing Logic

```ts
eventBus.subscribe(SolveAdded, async (event) => {
  const { solve } = event;
  
  logger.debug('analytics', 'Solve recorded', {
    time: solve.time,
    penalty: solve.penalty,
    device: state.activeDevice?.type,
    session: state.session._id,
  });
  
  // Could send to backend analytics if needed
});
```

---

## ConfigService

**Responsibility**: Persist and retrieve application settings.

Not a service in the event-driven sense — it's the `IConfigRepository` implementation that listens for config changes.

```ts
eventBus.subscribe(ConfigUpdated, async (event) => {
  const { keys } = event;
  
  for (const key of keys) {
    const value = configState[key];
    await configRepo.set(key, value);
  }
});
```

---

## Service Initialization

Services are initialized separately from handlers, typically in `+layout.svelte`:

```ts
// Initialize repositories
const repos = createRepositories();

// Initialize services (they listen to events)
const deviceManager = new DeviceManager(repos);
const scrambleService = new ScrambleService(primaryGenerator, fallbackGenerator);
const imageService = new ImageService();
const celebrationService = new CelebrationService(configRepo);
const analyticsService = new AnalyticsService(logger);

// Initialize handlers
setupAllHandlers();

// Start listening
eventBus.start();
```

---

## Service vs Handler Differences

| Aspect | Handler | Service |
|--------|---------|---------|
| **Trigger** | Event subscriptions | Event subscriptions |
| **Responsibility** | Update state | External operations (generation, persistence, coordination) |
| **Emit** | Can emit new events | Can emit events |
| **Call Each Other** | NO | Prefer events, can use if needed |
| **Timing** | Synchronous (queued) | Can be asynchronous (async work) |
| **Examples** | SolveAddedHandler, SessionSwitched Handler | DeviceManager, ScrambleService, ImageService |
| **State Update** | Handlers update `$state` | Services do NOT update $state directly |

---

## Event Flow with Services

**Example: Complete a Solve**

```
1. DeviceStopped event arrives
   ↓
2. Timer State Handlers execute (synchronous)
   - Sets timerState = STOPPED
   - Sets time = event.time
   ↓
3. SolveAdded Handler executes (synchronous)
   - Appends to solves[]
   - Emits ScrambleRequested
   ↓
4. ScrambleRequested event queued
   ↓
5. ScrambleService listens (may be async)
   - Generates scramble
   - Emits ScrambleGenerated asynchronously
   ↓
6. ImageService listens (async, non-blocking)
   - Generates image
   - Stores in cache
   - Emits ImageGenerated
   ↓
7. StatisticsRequested event (from separate handler)
   ↓
8. CalculateStatistics use case executes
   - Recalculates metrics
   - Emits StatisticsUpdated with newRecords
   ↓
9. CelebrationService listens
   - Checks if celebration enabled
   - Triggers celebration
   ↓
10. UI re-renders from updated $state
```

---

## Error Handling in Services

Services handle errors like handlers:

```ts
eventBus.subscribe(SomeEvent, async (event) => {
  try {
    // Do work
  } catch (error) {
    logger.error('ServiceName', 'Operation failed', { error });
    
    // Emit error event if user needs to know
    await eventBus.emit(new ServiceError(
      'ServiceName',
      'Descriptive error message'
    ));
  }
});
```

Services do NOT crash the app. Errors are logged and handled gracefully.

