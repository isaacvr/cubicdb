import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerState } from '../TimerState.svelte';

export function registerScrambleHandlers(
  bus: IEventBus<TimerEvent>,
  state: TimerState,
  ownerId: string,
): EventSubscription {
  const subscriptions = [
    bus.subscribe(
      TIMER_EVENTS.SCRAMBLE_REQUESTED,
      `${ownerId}:scramble:requested`,
      event => {
        if (event.payload.ownerId !== ownerId) return;
        state.scrambleRequestId = event.id;
        state.scrambleMode = event.payload.mode;
        state.scrambleLength = event.payload.length;
        state.scrambleProbability = Array.isArray(event.payload.probability)
          ? [...event.payload.probability]
          : event.payload.probability;
      },
      { priority: 100 },
    ),
    bus.subscribe(
      TIMER_EVENTS.SCRAMBLE_GENERATED,
      `${ownerId}:scramble:generated`,
      event => {
        if (event.payload.ownerId !== ownerId) return;
        if (event.payload.requestId !== state.scrambleRequestId) return;
        state.scramble = event.payload.scramble;
      },
    ),
  ];

  return {
    unsubscribe() {
      for (const subscription of subscriptions) subscription.unsubscribe();
    },
  };
}
