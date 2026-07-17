import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import { EventBus } from '$lib/events/EventBus';
import { GENERATION_EVENTS, type ImageGenerationConfig } from '$lib/events/generation';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { IImageGenerator } from './IImageGenerator';
import { IMAGE_GENERATION_MAX_ATTEMPTS, ImageGenerationService } from './ImageGenerationService';

const config: ImageGenerationConfig = {
  scramble: "R U R'",
  puzzle: 'rubik',
  mode: CubeMode.OLL,
  view: 'bird',
  order: [3, 3, 3],
};

function createHarness(generator: IImageGenerator) {
  let id = 0;
  const events = new TimerEventFactory(
    { now: () => 100 },
    { next: () => `id-${++id}` },
  );
  const bus = new EventBus<TimerEvent>();
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new ImageGenerationService(bus, events, generator);
  return { bus, events, observed, service };
}

describe('ImageGenerationService', () => {
  it('publishes generated images for supported configs', async () => {
    const { bus, events, observed, service } = createHarness({
      supports: () => true,
      generate: vi.fn().mockResolvedValue(['svg']),
    });

    const request = events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'timer:1',
      config,
    });
    await bus.publish(request);

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_GENERATED,
      payload: { scopeId: 'timer:1', requestId: request.id, images: ['svg'] },
    });
    service.destroy();
  });

  it('publishes retry diagnostics and final failure after exactly three attempts', async () => {
    const generator = {
      supports: () => true,
      generate: vi.fn().mockRejectedValue(new Error('draw failed')),
    };
    const { bus, events, observed, service } = createHarness(generator);

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'timer:1',
      config,
    }));

    await vi.waitFor(() => {
      expect(observed.at(-1)?.type).toBe(GENERATION_EVENTS.IMAGE_FAILED);
    });
    expect(generator.generate).toHaveBeenCalledTimes(IMAGE_GENERATION_MAX_ATTEMPTS);
    expect(observed.filter(event => event.type === GENERATION_EVENTS.IMAGE_RETRYING)).toHaveLength(2);
    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.IMAGE_FAILED,
      payload: {
        scopeId: 'timer:1',
        errors: [{ name: 'Error', message: 'draw failed' }],
      },
    });
    service.destroy();
  });

  it('keeps CubeMode and CubeView in the adapter config', async () => {
    const generate = vi.fn().mockResolvedValue(['svg']);
    const { bus, events, service } = createHarness({ supports: () => true, generate });

    await bus.publish(events.create(GENERATION_EVENTS.IMAGE_REQUESTED, {
      scopeId: 'algorithm:oll',
      config: { ...config, mode: CubeMode.PLL, view: 'plan' },
    }));

    expect(generate).toHaveBeenCalledWith({ ...config, mode: CubeMode.PLL, view: 'plan' });
    service.destroy();
  });
});
