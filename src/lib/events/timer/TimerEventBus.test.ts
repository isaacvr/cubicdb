import { describe, expect, it, vi } from 'vitest';
import { TimerEventBus } from './TimerEventBus';
import { TimerEventFactory } from './TimerEventFactory';
import { TIMER_EVENTS } from './TimerEventRegistry';

function createHarness() {
  let id = 0;
  let now = 100;
  const factory = new TimerEventFactory(
    { now: () => now++ },
    { next: () => `event-${++id}` },
  );
  return { bus: new TimerEventBus(factory), factory };
}

describe('TimerEventBus', () => {
  it('delivers handlers sequentially by priority', async () => {
    const { bus, factory } = createHarness();
    const order: string[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'low', async () => {
      await Promise.resolve();
      order.push('low');
    }, { priority: 1 });
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'high', () => {
      order.push('high');
    }, { priority: 10 });

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));

    expect(order).toEqual(['high', 'low']);
  });

  it('queues nested publication after every handler of the current event', async () => {
    const { bus, factory } = createHarness();
    const order: string[] = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'publisher', async () => {
      order.push('ready:first');
      await bus.publish(factory.create(TIMER_EVENTS.DEVICE_RUN_STARTED, { deviceId: 'keyboard' }));
    });
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'second', () => order.push('ready:second'));
    bus.subscribe(TIMER_EVENTS.DEVICE_RUN_STARTED, 'started', () => order.push('started'));

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));

    expect(order).toEqual(['ready:first', 'ready:second', 'started']);
  });

  it('supports once subscriptions and explicit unsubscribe', async () => {
    const { bus, factory } = createHarness();
    const once = vi.fn();
    const removed = vi.fn();
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'once', once, { once: true });
    const subscription = bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'removed', removed);
    subscription.unsubscribe();

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));
    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));

    expect(once).toHaveBeenCalledOnce();
    expect(removed).not.toHaveBeenCalled();
  });

  it('isolates a failed handler and publishes one handler-failed event', async () => {
    const { bus, factory } = createHarness();
    const remaining = vi.fn();
    const failures: Array<{ eventId: string; handlerId: string; message: string }> = [];
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'broken-handler', () => {
      throw new TypeError('broken');
    });
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'remaining-handler', remaining);
    bus.subscribe(TIMER_EVENTS.HANDLER_FAILED, 'failure-recorder', event => {
      failures.push({
        eventId: event.payload.eventId,
        handlerId: event.payload.handlerId,
        message: event.payload.error.message,
      });
    });
    const source = factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' });

    await bus.publish(source);

    expect(remaining).toHaveBeenCalledOnce();
    expect(failures).toEqual([{ eventId: source.id, handlerId: 'broken-handler', message: 'broken' }]);
  });

  it('does not recurse when a handler-failed subscriber throws', async () => {
    const { bus, factory } = createHarness();
    const failureHandler = vi.fn(() => {
      throw new Error('failure handler broke');
    });
    bus.subscribe(TIMER_EVENTS.DEVICE_READY, 'broken', () => {
      throw new Error('source broke');
    });
    bus.subscribe(TIMER_EVENTS.HANDLER_FAILED, 'broken-failure-handler', failureHandler);

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));

    expect(failureHandler).toHaveBeenCalledOnce();
  });
});
