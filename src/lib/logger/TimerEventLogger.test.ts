import { describe, expect, it, vi } from 'vitest';
import { TimerEventBus } from '$lib/events/timer/TimerEventBus';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { TimerEventLogger } from './TimerEventLogger';

describe('TimerEventLogger', () => {
  it('logs the complete typed event envelope to the visual event category', async () => {
    const factory = new TimerEventFactory(
      { now: () => 42.5 },
      { next: () => 'event-1' },
    );
    const bus = new TimerEventBus(factory);
    const info = vi.fn();
    const eventLogger = new TimerEventLogger(bus, { info });
    const event = factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' });

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
    const bus = new TimerEventBus(factory);
    const info = vi.fn();
    const eventLogger = new TimerEventLogger(bus, { info });
    eventLogger.destroy();

    await bus.publish(factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' }));

    expect(info).not.toHaveBeenCalled();
  });
});
