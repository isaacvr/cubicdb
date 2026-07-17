import type { EventSubscription, IEventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { TimerState } from '../TimerState.svelte';

export function registerScrambleHandlers(
  bus: IEventBus<TimerEvent>,
  state: TimerState,
  ownerId: string,
): EventSubscription {
  const subscriptions = [
    bus.subscribe(
      GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      `${ownerId}:scramble:requested`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        state.scrambleRequestId = event.id;
        state.scrambleMode = event.payload.config.mode;
        state.scrambleLength = event.payload.config.length ?? 0;
        state.scrambleProbability = Array.isArray(event.payload.config.probability)
          ? [...event.payload.config.probability]
          : event.payload.config.probability ?? -1;
      },
      { priority: 100 },
    ),
    bus.subscribe(
      GENERATION_EVENTS.SCRAMBLE_GENERATED,
      `${ownerId}:scramble:generated`,
      event => {
        if (event.payload.scopeId !== ownerId) return;
        if (event.payload.requestId !== state.scrambleRequestId) return;
        state.scramble = event.payload.scrambles[0] ?? '';
      },
    ),
  ];

  return {
    unsubscribe() {
      for (const subscription of subscriptions) subscription.unsubscribe();
    },
  };
}
