import { describe, expect, it, vi } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { SCRAMBLE_REQUEST_SOURCES } from '$lib/events/timer/ScrambleEventTypes';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import type { IScrambleGenerator } from './IScrambleGenerator';
import { ScrambleService } from './ScrambleService';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

function requestPayload(providedScramble?: string) {
  return {
    ownerId: 'timer:one',
    mode: '333',
    length: 20,
    probability: -1,
    source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    ...(providedScramble === undefined ? {} : { providedScramble }),
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
    const request = events.create(
      TIMER_EVENTS.SCRAMBLE_REQUESTED,
      requestPayload('R U'),
    );

    await bus.publish(request);
    await settle();

    expect(generator.generate).not.toHaveBeenCalled();
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SCRAMBLE_GENERATED,
      payload: {
        ownerId: 'timer:one',
        requestId: request.id,
        scramble: 'normalized:R U',
      },
    });
    service.destroy();
  });

  it('skips unsupported generators and publishes the first normalized success', async () => {
    const unsupported: IScrambleGenerator = {
      id: 'unsupported',
      supports: () => false,
      generate: vi.fn(() => 'unused'),
    };
    const empty: IScrambleGenerator = {
      id: 'empty',
      supports: () => true,
      generate: vi.fn(() => null),
    };
    const broken: IScrambleGenerator = {
      id: 'broken',
      supports: () => true,
      generate: vi.fn(() => { throw new TypeError('broken generator'); }),
    };
    const successful: IScrambleGenerator = {
      id: 'successful',
      supports: () => true,
      generate: vi.fn(() => '  R U  '),
    };
    const { bus, events, observed, service } = createHarness([
      unsupported,
      empty,
      broken,
      successful,
    ]);
    const request = events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, requestPayload());

    await bus.publish(request);
    await settle();

    expect(unsupported.generate).not.toHaveBeenCalled();
    expect(successful.generate).toHaveBeenCalledWith({ mode: '333', length: 20, probability: -1 });
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SCRAMBLE_GENERATED,
      payload: { requestId: request.id, scramble: 'R U' },
    });
    service.destroy();
  });

  it('publishes ordered normalized errors when every supported generator fails', async () => {
    const generators: IScrambleGenerator[] = [
      { id: 'empty', supports: () => true, generate: () => null },
      { id: 'throws', supports: () => true, generate: () => { throw 'no scramble'; } },
    ];
    const { bus, events, observed, service } = createHarness(generators);
    const request = events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, requestPayload());

    await bus.publish(request);
    await settle();

    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SCRAMBLE_GENERATION_FAILED,
      payload: {
        requestId: request.id,
        errors: [
          { generatorId: 'empty', error: { name: 'Error', message: 'Generator returned no scramble' } },
          { generatorId: 'throws', error: { name: 'Error', message: 'no scramble' } },
        ],
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
    const firstRequest = events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, requestPayload());
    const secondRequest = events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, requestPayload());

    await bus.publish(firstRequest);
    await bus.publish(secondRequest);
    second.resolve('second');
    await settle();
    first.resolve('first');
    await settle();

    const results = observed.filter(event => event.type === TIMER_EVENTS.SCRAMBLE_GENERATED);
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
    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_REQUESTED, requestPayload()));

    service.destroy();
    pending.resolve('late');
    await settle();

    expect(observed.some(event => event.type === TIMER_EVENTS.SCRAMBLE_GENERATED)).toBe(false);
  });
});
