# State Management

## Three Mechanisms, Three Purposes

| Mechanism | Purpose | Example |
|---|---|---|
| **EventBus** | Discrete domain events. Source of truth. | `DeviceStopped`, `SolveAdded`, `SessionSwitched` |
| **Svelte 5 `$state`** | Reactive layer for the UI. Subordinate to events. | `timerState`, `time`, `scramble`, `solves[]` |
| **Svelte context** | Dependency injection in component trees. | Passing the timer controller to child components |

### Fundamental Rule

**Events command, `$state` obeys.** When an event arrives, the reactor updates `$state`. The UI reacts to `$state`. Never the other way around.

```
Event arrives → Reactor updates $state → UI re-renders
```

## Svelte 5 Runes (Store Replacement)

### Before (stores)

```ts
class TimerController {
  timerState = writable(TimerState.CLEAN);
  time = writable(0);
  ready = writable(false);
}

// Usage in component
const state = get(timerController.timerState);
timerController.timerState.set(TimerState.RUNNING);
```

### After ($state)

```ts
class TimerState {
  timerState = $state(TimerState.CLEAN);
  time = $state(0);
  ready = $state(false);
  scramble = $state('');
  solves: Solve[] = $state([]);
  // ...
}
```

### Caveats with $state in Classes

The main issue with `$state` outside components is reactivity when passing references.
When a `$state` property is passed to another context, it must be passed as a getter, not as a direct value:

```ts
// BAD: loses reactivity
const time = timerState.time; // value copy, not reactive

// GOOD: keep reference to the object
const state = timerState; // access via state.time (reactive)

// GOOD: explicit getter if you need to pass an individual value
function getTime() { return timerState.time; }
```

The rule: pass the container object, not individual properties.
Components access `state.time`, not `time` directly.

## Reactor with $state

```ts
class TimerReactor {
  constructor(
    private eventBus: IEventBus,
    private state: TimerState,
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.eventBus.subscribe(DeviceEnteredPrevention, () => {
      this.state.timerState = TimerState.PREVENTION;
      this.state.time = 0;
      this.state.ready = false;
    });

    this.eventBus.subscribe(DeviceStopped, (e) => {
      this.state.timerState = TimerState.STOPPED;
      this.state.time = e.time;
      // side effects...
    });

    // ...
  }
}
```

## Accessible Global State

Each app section has its own state. They are not shared between sections
except in very specific cases (e.g., iCarry connected available for tutorials).

For those cross-section cases, the EventBus is the communication channel,
never direct access to another section's state.

## EventBus: Processing Order

Events are processed in the order they arrive, sequentially.
Each handler must complete before the next one executes.
This guarantees state consistency (e.g., solve saved before recalculating stats).
