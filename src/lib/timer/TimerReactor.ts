import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerState } from './TimerState.svelte';

export class TimerReactor {
  private subscriptions: EventSubscription[] = [];

  constructor(
    private readonly eventBus: IEventBus<TimerEvent>,
    private readonly state: TimerState,
    private readonly ownerId: string,
  ) {
    this.registerLifecycleProjections();
  }

  destroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions = [];
  }

  private registerLifecycleProjections(): void {
    this.subscriptions.push(
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PREVENTION_ENTERED, `${this.ownerId}:timer-reactor:prevention`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.PREVENTION;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.time = 0;
        this.state.decimals = true;
        this.state.ready = false;
        this.state.steps = [];
        this.state.penalty = Penalty.NONE;
        this.state.dnfFromInspection = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED, `${this.ownerId}:timer-reactor:green-light`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.ready = event.payload.ready;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_INSPECTION_STARTED, `${this.ownerId}:timer-reactor:inspection`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.INSPECTION;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.decimals = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_STARTED, `${this.ownerId}:timer-reactor:run-started`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.RUNNING;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.decimals = true;
        this.state.ready = false;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_STOPPED, `${this.ownerId}:timer-reactor:run-stopped`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.STOPPED;
        this.state.activeDeviceId = event.payload.deviceId;
        this.state.time = event.payload.elapsedMs;
        this.state.steps = [...event.payload.steps];
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PAUSED, `${this.ownerId}:timer-reactor:paused`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.PAUSE;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RESUMED, `${this.ownerId}:timer-reactor:resumed`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.timerState = TimerStateValue.RUNNING;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_RUN_CANCELLED, `${this.ownerId}:timer-reactor:cancelled`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.reset();
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_PENALTY_APPLIED, `${this.ownerId}:timer-reactor:penalty`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.penalty = event.payload.penalty;
        this.state.dnfFromInspection = event.payload.penalty === Penalty.DNF
          && event.payload.fromInspection;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.DEVICE_STEP_COMPLETED, `${this.ownerId}:timer-reactor:step`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.steps = [...this.state.steps, event.payload.elapsedMs];
      }),
      this.eventBus.subscribe(TIMER_EVENTS.SCRAMBLE_GENERATED, `${this.ownerId}:timer-reactor:scramble`, event => {
        this.state.scramble = event.payload.scramble;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.STATISTICS_UPDATED, `${this.ownerId}:timer-reactor:statistics`, event => {
        this.state.statistics = event.payload.statistics;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_CHANGED, `${this.ownerId}:timer-reactor:active-device`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.activeDeviceId = event.payload.deviceId;
      }),
      this.eventBus.subscribe(TIMER_EVENTS.ACTIVE_DEVICE_RELEASED, `${this.ownerId}:timer-reactor:active-device-released`, event => {
        if (event.payload.ownerId !== this.ownerId) return;
        this.state.activeDeviceId = null;
      }),
    );
  }
}
