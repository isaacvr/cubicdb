import { beforeEach, describe, expect, it } from 'vitest';
import type { EventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS } from '$lib/events/generation';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
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

  function requested(scopeId: string) {
    return events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
      scopeId,
      config: {
        mode: '333',
        count: 1,
        length: 20,
        probability: [1, 2],
        source: 'user-requested',
      },
    });
  }

  function generated(scopeId: string, requestId: string, scramble: string) {
    return events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId,
      requestId,
      scrambles: [scramble],
    });
  }

  it('projects only the latest correlated result for its scope', async () => {
    const subscription = registerScrambleHandlers(bus, state, 'timer:one');
    const stale = requested('timer:one');
    const current = requested('timer:one');

    await bus.publish(requested('timer:two'));
    expect(state.scrambleRequestId).toBeNull();

    await bus.publish(stale);
    await bus.publish(current);
    expect(state).toMatchObject({
      scrambleRequestId: current.id,
      scrambleMode: '333',
      scrambleLength: 20,
      scrambleProbability: [1, 2],
    });

    await bus.publish(generated('timer:one', stale.id, 'stale'));
    await bus.publish(generated('timer:two', current.id, 'other scope'));
    await bus.publish(generated('timer:one', current.id, 'current'));

    expect(state.scramble).toBe('current');
    subscription.unsubscribe();
  });

  it('stops projecting after unsubscribe', async () => {
    const subscription = registerScrambleHandlers(bus, state, 'timer:one');
    subscription.unsubscribe();

    await bus.publish(requested('timer:one'));

    expect(state.scrambleRequestId).toBeNull();
  });
});
