import { describe, expect, it } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { KeyboardInputBoundary } from './KeyboardInputBoundary';

describe('KeyboardInputBoundary', () => {
  it('publishes relevant native keys with the browser timestamp', async () => {
    let id = 0;
    const events = new TimerEventFactory(
      { now: () => 999 },
      { next: () => `event-${++id}` },
    );
    const bus = createApplicationEventBus(events);
    const observed: Array<{ type: string; timestamp: number }> = [];
    bus.observe(event => {
      observed.push({ type: event.type, timestamp: event.timestamp });
    });
    const boundary = new KeyboardInputBoundary(bus, events);

    await boundary.keyDown({ code: 'Space', repeat: false, timeStamp: 12.5 });
    await boundary.keyUp({ code: 'Space', timeStamp: 20.25 });

    expect(observed).toEqual([
      { type: TIMER_EVENTS.KEYBOARD_KEY_DOWN, timestamp: 12.5 },
      { type: TIMER_EVENTS.KEYBOARD_KEY_UP, timestamp: 20.25 },
    ]);
  });

  it('ignores repeated and unrelated keydown events', async () => {
    const events = new TimerEventFactory(
      { now: () => 1 },
      { next: () => 'event-1' },
    );
    const bus = createApplicationEventBus(events);
    const observed: string[] = [];
    bus.observe(event => {
      observed.push(event.type);
    });
    const boundary = new KeyboardInputBoundary(bus, events);

    await boundary.keyDown({ code: 'Space', repeat: true, timeStamp: 1 });
    await boundary.keyDown({ code: 'KeyA', repeat: false, timeStamp: 2 });

    expect(observed).toEqual([]);
  });
});
