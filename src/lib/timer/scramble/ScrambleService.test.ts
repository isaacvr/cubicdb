import { describe, expect, it, vi } from 'vitest';
import { GENERATION_EVENTS } from '$lib/events/generation';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { IScrambleGenerator } from './IScrambleGenerator';
import { ScrambleService } from './ScrambleService';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createHarness(generators: IScrambleGenerator[], normalize = (value: string) => value.trim()) {
  let id = 0;
  const events = new TimerEventFactory(
    { now: () => 100 },
    { next: () => `event-${++id}` },
  );
  const bus = createApplicationEventBus(events);
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new ScrambleService(bus, events, generators, normalize);
  return { bus, events, observed, service };
}

function requestPayload(mode = '333') {
  return {
    scopeId: 'timer:one',
    config: {
      mode,
      count: 1,
      length: 20,
      probability: -1,
      source: 'user-requested',
    },
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ScrambleService', () => {
  it('normalizes a provided scramble without calling a generator', async () => {
    const generator: IScrambleGenerator = {
      id: 'unused',
      supports: () => true,
      generate: vi.fn(() => 'generated'),
    };
    const normalize = vi.fn((value: string) => `normalized:${value}`);
    const { bus, events, observed, service } = createHarness([generator], normalize);
    const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
      ...requestPayload(),
      config: {
        ...requestPayload().config,
        providedScramble: 'R U',
      },
    });

    await bus.publish(request);
    await settle();

    expect(generator.generate).not.toHaveBeenCalled();
    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.SCRAMBLE_GENERATED,
      payload: {
        scopeId: 'timer:one',
        requestId: request.id,
        scrambles: ['normalized:R U'],
      },
    });
    service.destroy();
  });

  it('skips unsupported generators and publishes normalized scramble arrays', async () => {
    const unsupported: IScrambleGenerator = {
      id: 'unsupported',
      supports: () => false,
      generate: vi.fn(() => 'unused'),
    };
    const successful: IScrambleGenerator = {
      id: 'successful',
      supports: () => true,
      generate: vi.fn()
        .mockReturnValueOnce('  R U  ')
        .mockReturnValueOnce('  F R  '),
    };
    const { bus, events, observed, service } = createHarness([
      unsupported,
      successful,
    ]);
    const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, {
      ...requestPayload(),
      config: {
        ...requestPayload().config,
        count: 2,
      },
    });

    await bus.publish(request);
    await settle();

    expect(unsupported.generate).not.toHaveBeenCalled();
    expect(successful.generate).toHaveBeenCalledTimes(2);
    expect(successful.generate).toHaveBeenCalledWith({ mode: '333', length: 20, probability: -1 });
    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.SCRAMBLE_GENERATED,
      payload: { requestId: request.id, scrambles: ['R U', 'F R'] },
    });
    service.destroy();
  });

  it('publishes ordered normalized errors when every supported generator fails', async () => {
    const generators: IScrambleGenerator[] = [
      { id: 'empty', supports: () => true, generate: () => null },
      { id: 'throws', supports: () => true, generate: () => { throw 'no scramble'; } },
    ];
    const { bus, events, observed, service } = createHarness(generators);
    const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, requestPayload());

    await bus.publish(request);
    await settle();

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.SCRAMBLE_FAILED,
      payload: {
        scopeId: 'timer:one',
        requestId: request.id,
        errors: [
          { name: 'Error', message: 'Generator returned no scramble', source: 'empty' },
          { name: 'Error', message: 'no scramble', source: 'throws' },
        ],
      },
    });
    service.destroy();
  });

  it('explains when no generator supports the requested mode', async () => {
    const generator: IScrambleGenerator = {
      id: 'unsupported',
      supports: () => false,
      generate: vi.fn(() => 'unused'),
    };
    const { bus, events, observed, service } = createHarness([generator]);
    const request = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, requestPayload('missing-mode'));

    await bus.publish(request);
    await settle();

    expect(observed.at(-1)).toMatchObject({
      type: GENERATION_EVENTS.SCRAMBLE_FAILED,
      payload: {
        scopeId: 'timer:one',
        requestId: request.id,
        errors: [{
          name: 'UnsupportedScrambleMode',
          message: 'No scramble generator supports mode "missing-mode"',
          source: 'scramble-service',
        }],
      },
    });
    service.destroy();
  });

  it('allows overlapping requests to finish out of order', async () => {
    const first = deferred<string | null>();
    const second = deferred<string | null>();
    const generator: IScrambleGenerator = {
      id: 'deferred',
      supports: () => true,
      generate: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    };
    const { bus, events, observed, service } = createHarness([generator]);
    const firstRequest = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, requestPayload());
    const secondRequest = events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, requestPayload());

    await bus.publish(firstRequest);
    await bus.publish(secondRequest);
    second.resolve('second');
    await settle();
    first.resolve('first');
    await settle();

    const results = observed.filter(event => event.type === GENERATION_EVENTS.SCRAMBLE_GENERATED);
    expect(results.map(event => event.payload.requestId)).toEqual([
      secondRequest.id,
      firstRequest.id,
    ]);
    service.destroy();
  });

  it('suppresses pending results after destroy', async () => {
    const pending = deferred<string | null>();
    const generator: IScrambleGenerator = {
      id: 'deferred',
      supports: () => true,
      generate: () => pending.promise,
    };
    const { bus, events, observed, service } = createHarness([generator]);
    await bus.publish(events.create(GENERATION_EVENTS.SCRAMBLE_REQUESTED, requestPayload()));

    service.destroy();
    pending.resolve('late');
    await settle();

    expect(observed.some(event => event.type === GENERATION_EVENTS.SCRAMBLE_GENERATED)).toBe(false);
  });
});
