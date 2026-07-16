import { describe, expect, it } from 'vitest';
import { TIMER_EVENTS } from './TimerEventRegistry';
import { TimerEventFactory } from './TimerEventFactory';

describe('TimerEventFactory', () => {
  it('defines unique event names', () => {
    const values = Object.values(TIMER_EVENTS);

    expect(new Set(values).size).toBe(values.length);
  });

  it('preserves a native input timestamp', () => {
    const factory = new TimerEventFactory(
      { now: () => 999 },
      { next: () => 'event-1' },
    );

    const event = factory.fromNative(
      TIMER_EVENTS.KEYBOARD_KEY_DOWN,
      { code: 'Space', repeat: false },
      { timeStamp: 12.75 },
    );

    expect(event).toEqual({
      id: 'event-1',
      type: TIMER_EVENTS.KEYBOARD_KEY_DOWN,
      timestamp: 12.75,
      payload: { code: 'Space', repeat: false },
    });
  });

  it('uses the monotonic clock for a programmatic event', () => {
    const factory = new TimerEventFactory(
      { now: () => 42.5 },
      { next: () => 'event-2' },
    );

    const event = factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' });

    expect(event.timestamp).toBe(42.5);
    expect(event.id).toBe('event-2');
  });

  it('requests a new ID for every event', () => {
    let nextId = 0;
    const factory = new TimerEventFactory(
      { now: () => 1 },
      { next: () => `event-${++nextId}` },
    );

    const first = factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' });
    const second = factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' });

    expect(first.id).not.toBe(second.id);
  });
});
