import { TIMER_EVENTS } from './TimerEventRegistry';
import { TimerEventFactory } from './TimerEventFactory';

const factory = new TimerEventFactory(
  { now: () => 1 },
  { next: () => 'event-id' },
);

factory.create(TIMER_EVENTS.DEVICE_READY, { deviceId: 'keyboard' });
factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
  deviceId: 'keyboard',
  elapsedMs: 1234,
  steps: [500, 734],
});

// @ts-expect-error DEVICE_READY requires deviceId.
factory.create(TIMER_EVENTS.DEVICE_READY, {});

factory.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
  deviceId: 'keyboard',
  // @ts-expect-error elapsedMs must be a number.
  elapsedMs: '1234',
  steps: [],
});

// @ts-expect-error Unknown event names are rejected.
factory.create('timer.unknown', {});
