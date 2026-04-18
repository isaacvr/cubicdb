# Timer Reactor

What the Timer does when it receives each event.

```ts
// Pseudocode of the Timer's subscriptions

class TimerReactor {
  constructor(private eventBus: IEventBus, private controller: TimerController) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // === Solve flow ===

    eventBus.subscribe(DeviceEnteredPrevention, (e) => {
      controller.timerState.set(TimerState.PREVENTION);
      controller.time.set(0);       // reset time on screen
      controller.decimals.set(true);
      controller.ready.set(false);
    });

    eventBus.subscribe(DeviceStartedInspection, (e) => {
      controller.timerState.set(TimerState.INSPECTION);
      controller.decimals.set(false);
    });

    eventBus.subscribe(DeviceReady, (e) => {
      controller.createNewSolve();
    });

    eventBus.subscribe(DeviceGreenLight, (e) => {
      controller.ready.set(true);  // green light on
    });

    eventBus.subscribe(DeviceStartedRunning, (e) => {
      controller.timerState.set(TimerState.RUNNING);
      controller.decimals.set(true);
      controller.ready.set(false); // green light off
    });

    eventBus.subscribe(DeviceStopped, (e) => {
      controller.timerState.set(TimerState.STOPPED);
      controller.time.set(e.time);

      // Side effects
      controller.addSolve(e.time, penalty, e.steps);
      controller.initScrambler(...);
      controller.updateStatistics(true);
    });

    eventBus.subscribe(DevicePaused, (e) => {
      controller.timerState.set(TimerState.PAUSE);
    });

    eventBus.subscribe(DeviceResumed, (e) => {
      controller.timerState.set(TimerState.RUNNING);
    });

    eventBus.subscribe(DeviceCancelled, (e) => {
      controller.timerState.set(TimerState.CLEAN);
      controller.time.set(0);
      controller.ready.set(false);
      controller.lastSolve.set(null);
    });

    // === Penalties ===

    eventBus.subscribe(DevicePenaltyApplied, (e) => {
      const solve = get(controller.lastSolve);
      if (solve) {
        solve.penalty = e.penalty;
        controller.lastSolve.set(solve);
      }
    });

    eventBus.subscribe(DeviceDNF, (e) => {
      controller.addSolve(Infinity, Penalty.DNF);
    });

    // === Scramble ===

    eventBus.subscribe(ScrambleRequested, (e) => {
      controller.initScrambler(...);
    });
  }
}
```
