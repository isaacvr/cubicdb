import { describe, expect, it, vi } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { EventLogger } from './EventLogger';

describe('EventLogger', () => {
  it('logs the complete typed event envelope to the visual event category', async () => {
    const factory = new TimerEventFactory(
      { now: () => 42.5 },
      { next: () => 'event-1' },
    );
    const bus = createApplicationEventBus(factory);
    const info = vi.fn();
    const eventLogger = new EventLogger(bus, { info });
    const event = factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' });

    await bus.publish(event);

    expect(info).toHaveBeenCalledWith('event', event.type, {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    });
    eventLogger.destroy();
  });

  it('stops logging after destroy', async () => {
    const factory = new TimerEventFactory(
      { now: () => 1 },
      { next: () => 'event-1' },
    );
    const bus = createApplicationEventBus(factory);
    const info = vi.fn();
    const eventLogger = new EventLogger(bus, { info });
    eventLogger.destroy();

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { ownerId: 'timer:one', deviceId: 'keyboard' }));

    expect(info).not.toHaveBeenCalled();
  });
});
