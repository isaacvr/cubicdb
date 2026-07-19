import type { EventSubscription } from "$lib/events/EventBus";

export type EventModuleDetach = () => void;

export interface EventModule {
  detach: EventModuleDetach;
}

export function createEventModule(subscriptions: readonly EventSubscription[]): EventModule {
  let detached = false;

  return {
    detach() {
      if (detached) return;
      detached = true;
      for (const subscription of subscriptions) subscription.unsubscribe();
    },
  };
}

export function detachEventModules(modules: readonly EventModule[]): void {
  for (const module of modules) module.detach();
}
