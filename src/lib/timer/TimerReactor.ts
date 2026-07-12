import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import type { ITimerEventBus } from '$lib/events/timer/TimerEventBus';
import type { TimerEventSubscription } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerState } from './TimerState.svelte';

export class TimerReactor {
  private subscriptions: TimerEventSubscription[] = [];

  constructor(
    private readonly eventBus: ITimerEventBus,
    private readonly state: TimerState,
  ) {
    this.registerLifecycleProjections();
  }

  destroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions = [];
  }

  private registerLifecycleProjections(): void {
    this.subscriptions.push(
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED, 'timer-reactor:prevention', event => {
        this.state.timerState = TimerStateValue.PREVENTION;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.time = 0;
        this.state.decimals = true;
        this.state.ready = false;
        this.state.steps = [];
        this.state.penalty = Penalty.NONE;
        this.state.dnfFromInspection = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED, 'timer-reactor:green-light', event => {
        this.state.ready = event.payload.ready;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_INSPECTION_STARTED, 'timer-reactor:inspection', event => {
        this.state.timerState = TimerStateValue.INSPECTION;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.decimals = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_STARTED, 'timer-reactor:run-started', event => {
        this.state.timerState = TimerStateValue.RUNNING;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.decimals = true;
        this.state.ready = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_STOPPED, 'timer-reactor:run-stopped', event => {
        this.state.timerState = TimerStateValue.STOPPED;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.time = event.payload.elapsedMs;
        this.state.steps = [...event.payload.steps];
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PAUSED, 'timer-reactor:paused', () => {
        this.state.timerState = TimerStateValue.PAUSE;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RESUMED, 'timer-reactor:resumed', () => {
        this.state.timerState = TimerStateValue.RUNNING;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_CANCELLED, 'timer-reactor:cancelled', () => {
        this.state.reset();
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, 'timer-reactor:penalty', event => {
        this.state.penalty = event.payload.penalty;
        this.state.dnfFromInspection = event.payload.penalty === Penalty.DNF
          && event.payload.fromInspection;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_STEP_COMPLETED, 'timer-reactor:step', event => {
        this.state.steps = [...this.state.steps, event.payload.elapsedMs];
      }),
      this.eventBus.subscribe(TIMER_EVENTS.SCRAMBLE_GENERATED, 'timer-reactor:scramble', event => {
        this.state.scramble = event.payload.scramble;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.STATISTICS_UPDATED, 'timer-reactor:statistics', event => {
        this.state.statistics = event.payload.statistics;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGED, 'timer-reactor:active-device', event => {
        this.state.activeDeviceId = event.payload.deviceId;
      }),
    );
  }
}
