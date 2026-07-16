import { assign, createActor, setup, type ActorRefFrom } from 'xstate';
import { Penalty } from '@interfaces';
import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IMonotonicClock } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerReadonlyView } from '../TimerReadonlyView';
import type { ITimerDevice, TimerReadingCallback } from './ITimerDevice';
import {
  TIMER_DEVICE_CAPABILITIES,
  TIMER_DEVICE_CONNECTION_STATUS,
  TIMER_DEVICE_IDS,
  TIMER_DEVICE_NAMES,
  TIMER_DEVICE_TYPES,
  type TimerDeviceActivationContext,
} from './TimerDeviceDescriptor';

export const KEYBOARD_DEVICE_TIMING = {
  DEFAULT_PREVENTION_MS: 200,
  DEFAULT_RESTART_GAP_MS: 1000,
  INSPECTION_PENALTY_GRACE_MS: 2000,
  DEFAULT_READING_INTERVAL_MS: 10,
  DEFAULT_INSPECTION_SECONDS: 15,
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export const KEYBOARD_CODES = {
  SPACE: 'Space',
  ESCAPE: 'Escape',
} as const;

type KeyboardMachineEvent =
  | { type: 'KEY_DOWN'; code: string; timestamp: number }
  | { type: 'KEY_UP'; code: string; timestamp: number };

interface KeyboardMachineContext {
  events: TimerEventFactory;
  view: TimerReadonlyView;
  ownerId: string;
  preventionMs: number;
  restartGapMs: number;
  startedAt: number;
  inspectionStartedAt: number;
  now(): number;
  onInspectionStarted(timestamp: number): void;
  onRunStarted(timestamp: number): void;
  onRunEnded(): void;
  publish(event: TimerEvent): void;
}

export interface KeyboardDeviceOptions {
  preventionMs?: number;
  restartGapMs?: number;
  readingIntervalMs?: number;
  clock?: IMonotonicClock;
}

function nativeTimestamp(timestamp: number): { timeStamp: number } {
  return { timeStamp: timestamp };
}

function inspectionDurationMs(context: KeyboardMachineContext): number {
  return (context.view.session?.settings.inspection
    || KEYBOARD_DEVICE_TIMING.DEFAULT_INSPECTION_SECONDS)
    * KEYBOARD_DEVICE_TIMING.MILLISECONDS_PER_SECOND;
}

const keyboardMachine = setup({
  types: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
  },
  delays: {
    prevention: ({ context }) => context.preventionMs,
    inspectionP2: ({ context }) => Math.max(
      0,
      context.inspectionStartedAt + inspectionDurationMs(context) - context.now(),
    ),
    inspectionDnf: ({ context }) => Math.max(
      0,
      context.inspectionStartedAt
        + inspectionDurationMs(context)
        + KEYBOARD_DEVICE_TIMING.INSPECTION_PENALTY_GRACE_MS
        - context.now(),
    ),
    restartGap: ({ context }) => context.restartGapMs,
  },
  guards: {
    isSpace: ({ event }) => event.code === KEYBOARD_CODES.SPACE,
    isEscape: ({ event }) => event.code === KEYBOARD_CODES.ESCAPE,
    isStopKey: ({ event }) => event.code === KEYBOARD_CODES.SPACE || /^Key[A-Z]$/.test(event.code),
    withoutPrevention: ({ context }) => context.view.session?.settings.withoutPrevention ?? false,
    hasInspectionAndSpace: ({ context, event }) =>
      event.code === KEYBOARD_CODES.SPACE && (context.view.session?.settings.hasInspection ?? false),
  },
  actions: {
    publishPrevention: ({ context, event }) => {
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_PREVENTION_ENTERED,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishReady: ({ context }) => {
      context.publish(context.events.create(
        TIMER_EVENTS.DEVICE_READY,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD },
      ));
    },
    publishInspection: ({ context, event }) => {
      context.onInspectionStarted(event.timestamp);
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_INSPECTION_STARTED,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD },
        nativeTimestamp(event.timestamp),
      ));
    },
    rememberInspectionStart: assign({
      inspectionStartedAt: ({ event }) => event.timestamp,
    }),
    publishInspectionP2: ({ context }) => {
      context.publish(context.events.create(
        TIMER_EVENTS.DEVICE_PENALTY_APPLIED,
        {
          ownerId: context.ownerId,
          deviceId: TIMER_DEVICE_IDS.KEYBOARD,
          penalty: Penalty.P2,
          fromInspection: true,
        },
      ));
    },
    publishInspectionDnf: ({ context }) => {
      context.onRunEnded();
      context.publish(context.events.create(
        TIMER_EVENTS.DEVICE_PENALTY_APPLIED,
        {
          ownerId: context.ownerId,
          deviceId: TIMER_DEVICE_IDS.KEYBOARD,
          penalty: Penalty.DNF,
          fromInspection: true,
        },
      ));
      context.publish(context.events.create(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        {
          ownerId: context.ownerId,
          deviceId: TIMER_DEVICE_IDS.KEYBOARD,
          elapsedMs: Infinity,
          steps: [],
        },
      ));
    },
    publishGreenLight: ({ context, event }) => {
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD, ready: true },
        nativeTimestamp(event.timestamp),
      ));
    },
    rememberStart: assign({
      startedAt: ({ event }) => event.timestamp,
    }),
    publishStarted: ({ context, event }) => {
      context.onRunStarted(event.timestamp);
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_RUN_STARTED,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishStopped: ({ context, event }) => {
      context.onRunEnded();
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        {
          ownerId: context.ownerId,
          deviceId: TIMER_DEVICE_IDS.KEYBOARD,
          elapsedMs: Math.max(0, event.timestamp - context.startedAt),
          steps: [],
        },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishCancelled: ({ context, event }) => {
      context.onRunEnded();
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_RUN_CANCELLED,
        { ownerId: context.ownerId, deviceId: TIMER_DEVICE_IDS.KEYBOARD },
        nativeTimestamp(event.timestamp),
      ));
    },
  },
}).createMachine({
  id: 'keyboard-device',
  initial: 'idle',
  context: ({ input }) => input as KeyboardMachineContext,
  on: {
    KEY_DOWN: { guard: 'isEscape', target: '.idle', actions: 'publishCancelled' },
  },
  states: {
    idle: {
      on: {
        KEY_DOWN: { guard: 'isSpace', target: 'prevention', actions: 'publishPrevention' },
      },
    },
    prevention: {
      always: {
        guard: 'withoutPrevention',
        target: 'ready',
        actions: 'publishReady',
      },
      after: { prevention: { target: 'ready', actions: 'publishReady' } },
      on: {
        KEY_UP: { guard: 'isSpace', target: 'idle', actions: 'publishCancelled' },
      },
    },
    ready: {
      on: {
        KEY_UP: [
          {
            guard: 'hasInspectionAndSpace',
            target: 'inspection',
            actions: ['rememberInspectionStart', 'publishInspection'],
          },
          { guard: 'isSpace', target: 'running', actions: ['rememberStart', 'publishStarted'] },
        ],
      },
    },
    inspection: {
      after: {
        inspectionP2: { actions: 'publishInspectionP2' },
        inspectionDnf: { target: 'cooldown', actions: 'publishInspectionDnf' },
      },
      on: {
        KEY_DOWN: { guard: 'isSpace', actions: 'publishGreenLight' },
        KEY_UP: { guard: 'isSpace', target: 'running', actions: ['rememberStart', 'publishStarted'] },
      },
    },
    running: {
      on: {
        KEY_DOWN: { guard: 'isStopKey', target: 'cooldown', actions: 'publishStopped' },
      },
    },
    cooldown: {
      after: { restartGap: { target: 'stopped' } },
    },
    stopped: {
      on: {
        KEY_DOWN: { guard: 'isSpace', target: 'prevention', actions: 'publishPrevention' },
      },
    },
  },
});

export class KeyboardDevice implements ITimerDevice {
  readonly descriptor = {
    id: TIMER_DEVICE_IDS.KEYBOARD,
    name: TIMER_DEVICE_NAMES.KEYBOARD,
    type: TIMER_DEVICE_TYPES.KEYBOARD,
    connectionStatus: TIMER_DEVICE_CONNECTION_STATUS.CONNECTED,
    capabilities: [TIMER_DEVICE_CAPABILITIES.KEYBOARD],
  } as const;
  private actor: ActorRefFrom<typeof keyboardMachine> | null = null;
  private subscriptions: EventSubscription[] = [];
  private readingTimer: ReturnType<typeof setInterval> | null = null;
  private readingStartedAt = 0;
  private readonly readingIntervalMs: number;
  private readonly clock: IMonotonicClock;

  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
    private readonly options: KeyboardDeviceOptions = {},
  ) {
    this.readingIntervalMs = options.readingIntervalMs
      ?? KEYBOARD_DEVICE_TIMING.DEFAULT_READING_INTERVAL_MS;
    this.clock = options.clock ?? { now: () => performance.now() };
  }

  start(context: TimerDeviceActivationContext): void {
    this.stop();
    const actor = createActor(keyboardMachine, {
      input: {
        events: this.events,
        view: context.readonlyView,
        ownerId: context.ownerId,
        preventionMs: this.options.preventionMs
          ?? KEYBOARD_DEVICE_TIMING.DEFAULT_PREVENTION_MS,
        restartGapMs: this.options.restartGapMs
          ?? KEYBOARD_DEVICE_TIMING.DEFAULT_RESTART_GAP_MS,
        startedAt: 0,
        inspectionStartedAt: 0,
        now: () => this.clock.now(),
        onInspectionStarted: (timestamp: number) => this.startInspectionReadings(
          timestamp,
          context.readonlyView,
          context.onReading,
        ),
        onRunStarted: (timestamp: number) => this.startReadings(timestamp, context.onReading),
        onRunEnded: () => this.stopReadings(),
        publish: (event: TimerEvent) => {
          // XState actions are synchronous; EventBus owns the queued async delivery.
          void this.bus.publish(event);
        },
      },
    });
    this.actor = actor;
    this.subscriptions = [
      this.bus.subscribe(TIMER_EVENTS.KEYBOARD_KEY_DOWN, 'keyboard-device:keydown', event => {
        actor.send({
          type: 'KEY_DOWN',
          code: event.payload.code,
          timestamp: event.timestamp,
        });
      }),
      this.bus.subscribe(TIMER_EVENTS.KEYBOARD_KEY_UP, 'keyboard-device:keyup', event => {
        actor.send({
          type: 'KEY_UP',
          code: event.payload.code,
          timestamp: event.timestamp,
        });
      }),
    ];
    actor.start();
  }

  stop(): void {
    this.stopReadings();
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions = [];
    this.actor?.stop();
    this.actor = null;
  }

  disconnect(): void {
    this.stop();
  }

  destroy(): void {
    this.stop();
  }

  private startReadings(timestamp: number, onReading: TimerReadingCallback): void {
    this.stopReadings();
    this.readingStartedAt = timestamp;
    this.readingTimer = setInterval(() => {
      const currentTimestamp = this.clock.now();
      onReading({
        timestamp: currentTimestamp,
        timeMs: Math.max(0, currentTimestamp - this.readingStartedAt),
        phase: 'running',
      });
    }, this.readingIntervalMs);
  }

  private startInspectionReadings(
    timestamp: number,
    view: TimerReadonlyView,
    onReading: TimerReadingCallback,
  ): void {
    this.stopReadings();
    const inspectionMs = (view.session?.settings.inspection
      ?? KEYBOARD_DEVICE_TIMING.DEFAULT_INSPECTION_SECONDS)
      * KEYBOARD_DEVICE_TIMING.MILLISECONDS_PER_SECOND;
    const inspectionEndsAt = timestamp + inspectionMs;
    const update = () => {
      const currentTimestamp = this.clock.now();
      onReading({
        timestamp: currentTimestamp,
        timeMs: Math.round(
          (inspectionEndsAt - currentTimestamp)
            / KEYBOARD_DEVICE_TIMING.MILLISECONDS_PER_SECOND,
        ) * KEYBOARD_DEVICE_TIMING.MILLISECONDS_PER_SECOND,
        phase: 'inspection',
      });
    };
    update();
    this.readingTimer = setInterval(update, this.readingIntervalMs);
  }

  private stopReadings(): void {
    if (this.readingTimer !== null) clearInterval(this.readingTimer);
    this.readingTimer = null;
  }
}
