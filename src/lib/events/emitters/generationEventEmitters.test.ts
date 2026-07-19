import { CubeMode } from "@constants";
import { describe, expect, it } from "vitest";
import { EventBus } from "$lib/events/EventBus";
import { GENERATION_EVENTS } from "$lib/events/generation";
import type { TimerEvent } from "$lib/events/timer/TimerEvent";
import { TimerEventFactory } from "$lib/events/timer/TimerEventFactory";
import { createGenerationEventEmitters } from "./generationEventEmitters";

function setup() {
  let id = 0;
  const bus = new EventBus<TimerEvent>();
  const events = new TimerEventFactory({ now: () => 321 }, { next: () => `request-${++id}` });
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  return { bus, events, observed };
}

describe("generationEventEmitters", () => {
  it("publishes scramble requests with scope and config", async () => {
    const { bus, events, observed } = setup();
    const emitters = createGenerationEventEmitters({ bus, events });

    const requestId = await emitters.requestScramble({
      scopeId: "timer:1",
      config: {
        mode: "333",
        count: 1,
        length: 20,
        probability: -1,
        source: "user-requested",
      },
    });

    expect(requestId).toBe("request-1");
    expect(observed[0]).toMatchObject({
      id: "request-1",
      type: GENERATION_EVENTS.SCRAMBLE_REQUESTED,
      timestamp: 321,
      payload: {
        scopeId: "timer:1",
        config: {
          mode: "333",
          count: 1,
          length: 20,
          probability: -1,
          source: "user-requested",
        },
      },
    });
  });

  it("publishes image requests with native timestamps", async () => {
    const { bus, events, observed } = setup();
    const emitters = createGenerationEventEmitters({ bus, events });

    await emitters.requestImage({
      scopeId: "timer:1",
      config: {
        scramble: "R U R'",
        puzzle: "rubik",
        mode: CubeMode.NORMAL,
        view: "trans",
        order: 3,
      },
      sourceEvent: { timeStamp: 654 },
    });

    expect(observed[0].type).toBe(GENERATION_EVENTS.IMAGE_REQUESTED);
    expect(observed[0].timestamp).toBe(654);
    expect(observed[0].payload).toMatchObject({
      scopeId: "timer:1",
      config: {
        scramble: "R U R'",
        view: "trans",
      },
    });
  });
});
