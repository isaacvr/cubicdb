import { beforeEach, describe, expect, it } from 'vitest';
import type { EventBus } from '$lib/events/EventBus';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { SCRAMBLE_REQUEST_SOURCES } from '$lib/events/timer/ScrambleEventTypes';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { TimerState } from '../TimerState.svelte';
import { registerScrambleHandlers } from './registerScrambleHandlers';

describe('registerScrambleHandlers', () => {
  let events: TimerEventFactory;
  let bus: EventBus<TimerEvent>;
  let state: TimerState;

  beforeEach(() => {
    let id = 0;
    events = new TimerEventFactory(
      { now: () => 10 },
      { next: () => `event-${++id}` },
    );
    bus = createApplicationEventBus(events);
    state = new TimerState();
  });

  function request(ownerId = 'timer:one') {
    return events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, {
      ownerId,
      mode: '333',
      length: 20,
      probability: [1, 2],
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });
  }

  it('projects only the latest correlated result for its owner', async () => {
    const subscription = registerScrambleHandlers(bus, state, 'timer:one');
    const stale = request();
    const current = request();

    await bus.publish(request('timer:two'));
    expect(state.scrambleRequestId).toBeNull();

    await bus.publish(stale);
    await bus.publish(current);
    expect(state).toMatchObject({
      scrambleRequestId: current.id,
      scrambleMode: '333',
      scrambleLength: 20,
      scrambleProbability: [1, 2],
    });

    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
      ...stale.payload,
      requestId: stale.id,
      scramble: 'stale',
    }));
    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
      ...current.payload,
      requestId: current.id,
      scramble: 'current',
    }));
    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_GENERATED, {
      ...current.payload,
      ownerId: 'timer:two',
      requestId: current.id,
      scramble: 'other owner',
    }));

    expect(state.scramble).toBe('current');
    subscription.unsubscribe();
  });

  it('stops projecting after unsubscribe', async () => {
    const subscription = registerScrambleHandlers(bus, state, 'timer:one');
    subscription.unsubscribe();

    await bus.publish(request());

    expect(state.scrambleRequestId).toBeNull();
  });
});
