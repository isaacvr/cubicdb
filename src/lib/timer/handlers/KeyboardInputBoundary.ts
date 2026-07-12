import type { ITimerEventBus } from '$lib/events/timer/TimerEventBus';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';

export interface NativeKeyDown {
  readonly code: string;
  readonly repeat: boolean;
  readonly timeStamp: number;
}

export interface NativeKeyUp {
  readonly code: string;
  readonly timeStamp: number;
}

const RELEVANT_KEYS = new Set(['Space', 'Escape']);

export class KeyboardInputBoundary {
  constructor(
    private readonly bus: ITimerEventBus,
    private readonly events: TimerEventFactory,
  ) {}

  keyDown(event: NativeKeyDown): Promise<void> {
    if (event.repeat || !RELEVANT_KEYS.has(event.code)) return Promise.resolve();
    return this.bus.publish(this.events.fromNative(
      TIMER_EVENTS.KEYBOARD_KEY_DOWN,
      { code: event.code, repeat: event.repeat },
      event,
    ));
  }

  keyUp(event: NativeKeyUp): Promise<void> {
    if (!RELEVANT_KEYS.has(event.code)) return Promise.resolve();
    return this.bus.publish(this.events.fromNative(
      TIMER_EVENTS.KEYBOARD_KEY_UP,
      { code: event.code },
      event,
    ));
  }
}
