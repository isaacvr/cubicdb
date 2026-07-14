import { assign, createActor, setup, type ActorRefFrom } from 'xstate';
import type { ITimerEventBus } from '$lib/events/timer/TimerEventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IMonotonicClock } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerReadonlyView } from '../TimerReadonlyView';
import type { ITimerDevice, TimerReadingCallback } from './ITimerDevice';
import {
  TIMER_DEVICE_IDS,
  type TimerDeviceActivationContext,
} from './TimerDeviceDescriptor';

type KeyboardMachineEvent =
  | { type: 'KEY_DOWN'; code: string; timestamp: number }
  | { type: 'KEY_UP'; code: string; timestamp: number };

interface KeyboardMachineContext {
  bus: ITimerEventBus;
  events: TimerEventFactory;
  view: TimerReadonlyView;
  preventionMs: number;
  startedAt: number;
  onRunStarted(timestamp: number): void;
  onRunEnded(): void;
  publish(event: TimerEvent): void;
}

export interface KeyboardDeviceOptions {
  preventionMs?: number;
  readingIntervalMs?: number;
  clock?: IMonotonicClock;
}

function nativeTimestamp(timestamp: number): { timeStamp: number } {
  return { timeStamp: timestamp };
}

const keyboardMachine = setup({
  types: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
  },
  delays: {
    prevention: ({ context }) => context.preventionMs,
  },
  guards: {
    isSpace: ({ event }) => event.code === 'Space',
    isEscape: ({ event }) => event.code === 'Escape',
    hasInspectionAndSpace: ({ context, event }) =>
      event.code === 'Space' && (context.view.session?.settings.hasInspection ?? false),
  },
  actions: {
    publishPrevention: ({ context, event }) => {
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_PREVENTION_ENTERED,
        { deviceId: 'keyboard' },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishReady: ({ context }) => {
      context.publish(context.events.create(
        TIMER_EVENTS.DEVICE_READY,
        { deviceId: 'keyboard' },
      ));
    },
    publishInspection: ({ context, event }) => {
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_INSPECTION_STARTED,
        { deviceId: 'keyboard' },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishGreenLight: ({ context, event }) => {
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED,
        { deviceId: 'keyboard', ready: true },
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
        { deviceId: 'keyboard' },
        nativeTimestamp(event.timestamp),
      ));
    },
    publishStopped: ({ context, event }) => {
      context.onRunEnded();
      context.publish(context.events.fromNative(
        TIMER_EVENTS.DEVICE_RUN_STOPPED,
        {
          deviceId: 'keyboard',
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
        { deviceId: 'keyboard' },
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
      after: { prevention: { target: 'ready', actions: 'publishReady' } },
      on: {
        KEY_UP: { guard: 'isSpace', target: 'idle', actions: 'publishCancelled' },
      },
    },
    ready: {
      on: {
        KEY_UP: [
          { guard: 'hasInspectionAndSpace', target: 'inspection', actions: 'publishInspection' },
          { guard: 'isSpace', target: 'running', actions: ['rememberStart', 'publishStarted'] },
        ],
      },
    },
    inspection: {
      on: {
        KEY_DOWN: { guard: 'isSpace', actions: 'publishGreenLight' },
        KEY_UP: { guard: 'isSpace', target: 'running', actions: ['rememberStart', 'publishStarted'] },
      },
    },
    running: {
      on: {
        KEY_DOWN: { guard: 'isSpace', target: 'stopping' },
      },
    },
    stopping: {
      on: {
        KEY_UP: { guard: 'isSpace', target: 'stopped', actions: 'publishStopped' },
      },
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
    name: 'Keyboard',
    type: 'timer_keyboard',
    connectionStatus: 'connected',
    capabilities: ['keyboard'],
  } as const;
  private readonly actor: ActorRefFrom<typeof keyboardMachine>;
  private readonly subscriptions;
  private readingTimer: ReturnType<typeof setInterval> | null = null;
  private readingStartedAt = 0;
  private readonly readingIntervalMs: number;
  private readonly clock: IMonotonicClock;

  constructor(
    bus: ITimerEventBus,
    events: TimerEventFactory,
    view: TimerReadonlyView,
    private readonly onReading: TimerReadingCallback,
    options: KeyboardDeviceOptions = {},
  ) {
    this.readingIntervalMs = options.readingIntervalMs ?? 10;
    this.clock = options.clock ?? { now: () => performance.now() };
    this.actor = createActor(keyboardMachine, {
      input: {
        bus,
        events,
        view,
        preventionMs: options.preventionMs ?? 300,
        startedAt: 0,
        onRunStarted: (timestamp: number) => this.startReadings(timestamp),
        onRunEnded: () => this.stopReadings(),
        publish: (event: TimerEvent) => {
          // XState actions are synchronous; EventBus owns the queued async delivery.
          void bus.publish(event);
        },
      },
    });
    this.subscriptions = [
      bus.subscribe(TIMER_EVENTS.KEYBOARD_KEY_DOWN, 'keyboard-device:keydown', event => {
        this.actor.send({
          type: 'KEY_DOWN',
          code: event.payload.code,
          timestamp: event.timestamp,
        });
      }),
      bus.subscribe(TIMER_EVENTS.KEYBOARD_KEY_UP, 'keyboard-device:keyup', event => {
        this.actor.send({
          type: 'KEY_UP',
          code: event.payload.code,
          timestamp: event.timestamp,
        });
      }),
    ];
  }

  start(_context?: TimerDeviceActivationContext): void {
    this.actor.start();
  }

  stop(): void {
    this.stopReadings();
    this.actor.stop();
  }

  disconnect(): void {
    this.stop();
  }

  destroy(): void {
    this.stop();
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  private startReadings(timestamp: number): void {
    this.stopReadings();
    this.readingStartedAt = timestamp;
    this.readingTimer = setInterval(() => {
      const currentTimestamp = this.clock.now();
      this.onReading({
        timestamp: currentTimestamp,
        elapsedMs: Math.max(0, currentTimestamp - this.readingStartedAt),
      });
    }, this.readingIntervalMs);
  }

  private stopReadings(): void {
    if (this.readingTimer !== null) clearInterval(this.readingTimer);
    this.readingTimer = null;
  }
}
