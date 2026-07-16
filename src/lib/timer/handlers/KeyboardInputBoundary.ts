import type { IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';

export interface NativeKeyDown {
  readonly code: string;
  readonly repeat: boolean;
  readonly timeStamp: number;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
}

export interface NativeKeyUp {
  readonly code: string;
  readonly timeStamp: number;
}

const KEY_UP_KEYS = new Set(['Space']);

function isRelevantKeyDown(event: NativeKeyDown): boolean {
  if (event.repeat || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return false;
  return event.code === 'Space' || event.code === 'Escape' || /^Key[A-Z]$/.test(event.code);
}

export class KeyboardInputBoundary {
  constructor(
    private readonly bus: IEventBus<TimerEvent>,
    private readonly events: TimerEventFactory,
  ) {}

  keyDown(event: NativeKeyDown): Promise<void> {
    if (!isRelevantKeyDown(event)) return Promise.resolve();
    return this.bus.publish(this.events.fromNative(
      TIMER_EVENTS.KEYBOARD_KEY_DOWN,
      { code: event.code, repeat: event.repeat },
      event,
    ));
  }

  keyUp(event: NativeKeyUp): Promise<void> {
    if (!KEY_UP_KEYS.has(event.code)) return Promise.resolve();
    return this.bus.publish(this.events.fromNative(
      TIMER_EVENTS.KEYBOARD_KEY_UP,
      { code: event.code },
      event,
    ));
  }
}
