import { describe, expect, it, vi } from 'vitest';
import { createApplicationEventBus, TimerEventFactory } from '$lib/events/timer/TimerEventFactory';
import type { TimerEvent } from '$lib/events/timer/TimerEvent';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { Penalty, type Solve } from '@interfaces';
import { SolvePersistenceService, type SolvePersistencePort } from './SolvePersistenceService';

function createSolve(overrides: Partial<Solve> = {}): Solve {
  return {
    _id: 'solve:one',
    time: 1234,
    date: 1000,
    scramble: 'R U R\'',
    penalty: Penalty.NONE,
    selected: false,
    session: 'session:one',
    ...overrides,
  };
}

function createHarness(port: SolvePersistencePort) {
  let id = 0;
  const events = new TimerEventFactory(
    { now: () => 42 },
    { next: () => `event-${++id}` },
  );
  const bus = createApplicationEventBus(events);
  const observed: TimerEvent[] = [];
  bus.observe(event => observed.push(event));
  const service = new SolvePersistenceService(bus, events, port);
  return { bus, events, observed, service };
}

describe('SolvePersistenceService', () => {
  it('persists scoped solve add requests and publishes scoped added events', async () => {
    const saved = createSolve({ _id: 'saved' });
    const port: SolvePersistencePort = {
      addSolve: vi.fn(async () => saved),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);
    const requestSolve = createSolve({ _id: 'draft' });

    await bus.publish(events.create(TIMER_EVENTS.SOLVE_ADD_REQUESTED, {
      ownerId: 'timer:one',
      solve: requestSolve,
    }));

    expect(port.addSolve).toHaveBeenCalledWith(requestSolve);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_ADDED,
      payload: {
        ownerId: 'timer:one',
        solve: saved,
      },
    });
    service.destroy();
  });

  it('persists scoped solve updates and publishes previous/current solve events', async () => {
    const previousSolve = createSolve({ comments: 'before' });
    const updatedSolve = createSolve({ comments: 'after' });
    const port: SolvePersistencePort = {
      addSolve: vi.fn(),
      updateSolve: vi.fn(async () => ({ previousSolve, solve: updatedSolve })),
      removeSolves: vi.fn(),
    };
    const { bus, events, observed, service } = createHarness(port);

    await bus.publish(events.create(TIMER_EVENTS.SOLVE_UPDATE_REQUESTED, {
      ownerId: 'timer:one',
      solve: updatedSolve,
    }));

    expect(port.updateSolve).toHaveBeenCalledWith(updatedSolve);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVE_UPDATED,
      payload: {
        ownerId: 'timer:one',
        previousSolve,
        solve: updatedSolve,
      },
    });
    service.destroy();
  });

  it('persists scoped solve removals and publishes scoped removed events', async () => {
    const removedSolve = createSolve({ _id: 'removed' });
    const port: SolvePersistencePort = {
      addSolve: vi.fn(),
      updateSolve: vi.fn(),
      removeSolves: vi.fn(async () => [removedSolve]),
    };
    const { bus, events, observed, service } = createHarness(port);

    await bus.publish(events.create(TIMER_EVENTS.SOLVES_REMOVE_REQUESTED, {
      ownerId: 'timer:one',
      solves: [removedSolve],
    }));

    expect(port.removeSolves).toHaveBeenCalledWith([removedSolve]);
    expect(observed.at(-1)).toMatchObject({
      type: TIMER_EVENTS.SOLVES_REMOVED,
      payload: {
        ownerId: 'timer:one',
        solves: [removedSolve],
      },
    });
    service.destroy();
  });
});
