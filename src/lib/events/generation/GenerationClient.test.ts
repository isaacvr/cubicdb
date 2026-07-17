import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import { EventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { createGenerationClient } from './GenerationClient';
import { GENERATION_EVENTS } from './GenerationEventRegistry';

function createHarness() {
  let id = 0;
  let now = 100;
  const events = new TimerEventFactory(
    { now: () => {
      now += 10;
      return now;
    } },
    { next: () => `id-${++id}` },
  );
  const bus = new EventBus<TimerEvent>();
  const client = createGenerationClient(bus, events, 'timer:1');
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));

  return { bus, client, events, observed };
}

describe('GenerationClient', () => {
  it('publishes scramble requests with the bound scope and native timestamp', async () => {
    const { client, observed } = createHarness();

    const requestId = await client.scrambles.request(
      { mode: '333', count: 1, length: 0, probability: -1 },
      { sourceEvent: { timeStamp: 321.5 } },
    );

    expect(requestId).toBe('id-1');
    expect(observed.at(-1)).toMatchObject({
      id: requestId,
      type: GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 321.5,
      payload: {
        scopeId: 'timer:1',
        config: { mode: '333', count: 1, length: 0, probability: -1 },
      },
    });
  });

  it('filters generated scramble events by scope and request id', async () => {
    const { bus, client, events } = createHarness();
    const generated = vi.fn();
    const requestId = await client.scrambles.request({ mode: '333' });
    client.scrambles.onGenerated(requestId, generated);

    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:2',
      requestId,
      scrambles: ['wrong-scope'],
    }));
    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:1',
      requestId: 'different-request',
      scrambles: ['wrong-request'],
    }));
    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_GENERATED, {
      scopeId: 'timer:1',
      requestId,
      scrambles: ['R U R'],
    }));

    expect(generated).toHaveBeenCalledTimes(1);
    expect(generated).toHaveBeenCalledWith({
      scopeId: 'timer:1',
      requestId,
      scrambles: ['R U R'],
    });
  });

  it('tears down subscriptions created by the client', async () => {
    const { bus, client, events } = createHarness();
    const generated = vi.fn();
    client.images.onGenerated(generated);
    client.destroy();

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_GENERATED, {
      scopeId: 'timer:1',
      requestId: 'image-1',
      images: ['svg'],
    }));

    expect(generated).not.toHaveBeenCalled();
  });

  it('publishes image requests with CubeMode and CubeView separated', async () => {
    const { client, observed } = createHarness();

    await client.images.request({
      scramble: "R U R'",
      puzzle: 'rubik',
      mode: CubeMode.OLL,
      view: 'bird',
      order: [3, 3, 3],
    });

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_REQUESTED,
      payload: {
        scopeId: 'timer:1',
        config: {
          scramble: "R U R'",
          puzzle: 'rubik',
          mode: CubeMode.OLL,
          view: 'bird',
          order: [3, 3, 3],
        },
      },
    });
  });
});
