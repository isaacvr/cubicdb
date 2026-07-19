import { describe, expect, it, vi } from "vitest";
import type { EventSubscription } from "$lib/events/EventBus";
import { createEventModule, detachEventModules } from "./EventModule";

function subscription(unsubscribe = vi.fn()): EventSubscription {
  return { unsubscribe };
}

describe("EventModule", () => {
  it("unsubscribes every subscription exactly once", () => {
    const first = vi.fn();
    const second = vi.fn();
    const module = createEventModule([subscription(first), subscription(second)]);

    module.detach();
    module.detach();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("detaches several modules", () => {
    const first = vi.fn();
    const second = vi.fn();

    detachEventModules([
      createEventModule([subscription(first)]),
      createEventModule([subscription(second)]),
    ]);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
