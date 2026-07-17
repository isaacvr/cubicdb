import { describe, expect, it, vi } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import { SCRAMBLE_PREVIEW_CLEAR_REASONS } from '$lib/events/timer/ScrambleEventTypes';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import type { IScramblePreviewGenerator } from './IScramblePreviewGenerator';
import {
  SCRAMBLE_PREVIEW_MAX_ATTEMPTS,
  ScramblePreviewService,
} from './ScramblePreviewService';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

function createHarness(generator: IScramblePreviewGenerator) {
  let id = 0;
  const events = new TimerEventFactory(
    { now: () => 200 },
    { next: () => `event-${++id}` },
  );
  const bus = createApplicationEventBus(events);
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new ScramblePreviewService(bus, events, generator);
  return { bus, events, observed, service };
}

function previewPayload() {
  return {
    ownerId: 'timer:one',
    scrambleRequestId: 'scramble-1',
    scramble: 'R U',
    mode: '333',
  };
}

describe('ScramblePreviewService', () => {
  it('publishes a correlated first-attempt success', async () => {
    const generator: IScramblePreviewGenerator = {
      supports: () => true,
      generate: vi.fn(async () => ['image-1']),
    };
    const { bus, events, observed, service } = createHarness(generator);
    const request = events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload());

    await bus.publish(request);
    await vi.waitFor(() => {
      expect(observed.at(-1)?.type).toBe(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED);
    });

    expect(observed.at(-1)).toMatchObject({
      payload: {
        ownerId: 'timer:one',
        scrambleRequestId: 'scramble-1',
        requestId: request.id,
        images: ['image-1'],
        attemptsUsed: 1,
      },
    });
    service.destroy();
  });

  it.each([2, 3])('publishes success on attempt %s', async successfulAttempt => {
    let attempts = 0;
    const generator: IScramblePreviewGenerator = {
      supports: () => true,
      generate: vi.fn(async () => {
        attempts += 1;
        if (attempts < successfulAttempt) throw new Error(`attempt ${attempts}`);
        return ['image'];
      }),
    };
    const { bus, events, observed, service } = createHarness(generator);

    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload()));
    await vi.waitFor(() => {
      expect(observed.at(-1)?.type).toBe(TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED);
    });

    expect(generator.generate).toHaveBeenCalledTimes(successfulAttempt);
    expect(observed.at(-1)?.payload).toMatchObject({ attemptsUsed: successfulAttempt });
    service.destroy();
  });

  it('publishes one final failure and clears after exactly three attempts', async () => {
    const generator: IScramblePreviewGenerator = {
      supports: () => true,
      generate: vi.fn(async () => { throw new TypeError('cannot draw'); }),
    };
    const { bus, events, observed, service } = createHarness(generator);
    const request = events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload());

    await bus.publish(request);
    await vi.waitFor(() => {
      expect(observed.at(-1)?.type).toBe(TIMER_EVENTS.SCRAMBLE_PREVIEW_CLEARED);
    });

    expect(generator.generate).toHaveBeenCalledTimes(SCRAMBLE_PREVIEW_MAX_ATTEMPTS);
    const failure = observed.find(event => (
      event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATION_FAILED
    ));
    expect(failure?.payload).toMatchObject({
      requestId: request.id,
      attemptsUsed: 3,
      error: { name: 'TypeError', message: 'cannot draw' },
    });
    expect(observed.at(-1)?.payload).toMatchObject({
      scrambleRequestId: 'scramble-1',
      reason: SCRAMBLE_PREVIEW_CLEAR_REASONS.GENERATION_FAILED,
    });
    service.destroy();
  });

  it('clears an unsupported mode without publishing a failure', async () => {
    const generator: IScramblePreviewGenerator = {
      supports: () => false,
      generate: vi.fn(async () => ['unused']),
    };
    const { bus, events, observed, service } = createHarness(generator);

    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload()));
    await vi.waitFor(() => {
      expect(observed.at(-1)?.type).toBe(TIMER_EVENTS.SCRAMBLE_PREVIEW_CLEARED);
    });

    expect(generator.generate).not.toHaveBeenCalled();
    expect(observed.at(-1)?.payload).toMatchObject({
      reason: SCRAMBLE_PREVIEW_CLEAR_REASONS.UNSUPPORTED_MODE,
    });
    expect(observed.some(event => (
      event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATION_FAILED
    ))).toBe(false);
    service.destroy();
  });

  it('allows overlapping requests to finish out of order', async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const generator: IScramblePreviewGenerator = {
      supports: () => true,
      generate: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    };
    const { bus, events, observed, service } = createHarness(generator);
    const firstRequest = events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload());
    const secondRequest = events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, {
      ...previewPayload(),
      scrambleRequestId: 'scramble-2',
    });

    await bus.publish(firstRequest);
    await bus.publish(secondRequest);
    second.resolve(['second']);
    await vi.waitFor(() => {
      expect(observed.some(event => (
        event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED
        && event.payload.requestId === secondRequest.id
      ))).toBe(true);
    });
    first.resolve(['first']);
    await vi.waitFor(() => {
      const results = observed.filter(event => event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED);
      expect(results).toHaveLength(2);
    });

    const results = observed.filter(event => event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED);
    expect(results.map(event => event.payload.requestId)).toEqual([secondRequest.id, firstRequest.id]);
    service.destroy();
  });

  it('suppresses pending output after destroy', async () => {
    const pending = deferred<string[]>();
    const generator: IScramblePreviewGenerator = {
      supports: () => true,
      generate: () => pending.promise,
    };
    const { bus, events, observed, service } = createHarness(generator);
    await bus.publish(events.create(TIMER_EVENTS.SCRAMBLE_PREVIEW_REQUESTED, previewPayload()));

    service.destroy();
    pending.resolve(['late']);
    await Promise.resolve();
    await Promise.resolve();

    expect(observed.some(event => event.type === TIMER_EVENTS.SCRAMBLE_PREVIEW_GENERATED)).toBe(false);
  });
});
