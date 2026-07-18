import { describe, expect, it, vi } from 'vitest';
import { AverageSetting, TimerState, type Solve } from '@interfaces';
import { GENERATION_EVENTS } from '$lib/events/generation';
import { SCRAMBLE_REQUEST_SOURCES, type ScrambleRequestSource } from '$lib/events/timer/ScrambleEventTypes';
import { TIMER_EVENTS } from '$lib/events/timer/TimerEventRegistry';
import { createTimerApplicationRuntime } from './TimerApplicationRuntime';
import { createTimerRuntime } from './TimerCompositionRoot.svelte';
import { TIMER_DEVICE_IDS } from './devices/TimerDeviceDescriptor';

function input(source: ScrambleRequestSource) {
  return { mode: '333', length: 20, probability: -1, source };
}

function session(scrambleAfterCancel: boolean) {
  return {
    _id: 'session',
    name: 'Session',
    settings: {
      hasInspection: true,
      inspection: 15,
      showElapsedTime: true,
      calcAoX: AverageSetting.SEQUENTIAL,
      genImage: true,
      scrambleAfterCancel,
      withoutPrevention: false,
    },
  };
}

describe('scramble lifecycle triggers', () => {
  it('requests the next scramble after the matching completed solve request', async () => {
    const order: string[] = [];
    const application = createTimerApplicationRuntime({
      devices: [],
      eventLogSink: null,
      solvePersistence: {
        addSolve: vi.fn(async solve => solve as Solve),
        updateSolve: vi.fn(),
        removeSolves: vi.fn(),
      },
    });
    const runtime = createTimerRuntime({
      application,
      ownerId: 'timer:one',
      flags: { scramble: true },
      getSolveRequest: () => ({ session: 'session', time: 500, scramble: 'R U' }),
      getScrambleRequest: source => input(source),
    });
    application.bus.subscribe(TIMER_EVENTS.SOLVE_ADD_REQUESTED, 'test:solve-request', event => {
      if (event.payload.ownerId === 'timer:one') order.push('solve-request');
    });
    application.bus.subscribe(GENERATION_EVENTS.SCRAMBLE_REQUESTED, 'test:request', event => {
      if (event.payload.scopeId === 'timer:one') order.push(event.payload.config.source ?? '');
    });
    await application.ready;

    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:two',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: 500,
      steps: [],
    }));
    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: Infinity,
      steps: [],
    }));

    expect(order).toEqual(['solve-request', SCRAMBLE_REQUEST_SOURCES.SOLVE_COMPLETED]);
    await runtime.destroy();
    await application.destroy();
  });

  it('requests after running cancellation only when the session option is enabled', async () => {
    const getScrambleRequest = vi.fn((source: ScrambleRequestSource) => input(source));
    const application = createTimerApplicationRuntime({ devices: [], eventLogSink: null });
    const runtime = createTimerRuntime({
      application,
      ownerId: 'timer:one',
      flags: { scramble: true },
      getScrambleRequest,
    });
    runtime.state.session = session(false);
    await application.ready;

    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      cancelledFrom: TimerState.RUNNING,
    }));
    expect(getScrambleRequest).not.toHaveBeenCalled();
    runtime.state.session = session(true);
    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      cancelledFrom: TimerState.PREVENTION,
    }));
    expect(getScrambleRequest).not.toHaveBeenCalled();
    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      cancelledFrom: TimerState.INSPECTION,
    }));
    expect(getScrambleRequest).not.toHaveBeenCalled();
    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:two',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      cancelledFrom: TimerState.RUNNING,
    }));
    expect(getScrambleRequest).not.toHaveBeenCalled();
    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_CANCELLED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      cancelledFrom: TimerState.RUNNING,
    }));

    expect(getScrambleRequest.mock.calls).toEqual([
      [SCRAMBLE_REQUEST_SOURCES.RUNNING_CANCELLED],
    ]);
    await runtime.destroy();
    await application.destroy();
  });

  it('skips lifecycle scramble publishing when no request can be resolved yet', async () => {
    const application = createTimerApplicationRuntime({ devices: [], eventLogSink: null });
    const runtime = createTimerRuntime({
      application,
      ownerId: 'timer:one',
      flags: { scramble: true },
      getScrambleRequest: () => null,
    });
    const requests: string[] = [];
    application.bus.subscribe(GENERATION_EVENTS.SCRAMBLE_REQUESTED, 'test:null-request', event => {
      if (event.payload.scopeId === 'timer:one') requests.push(event.id);
    });
    await application.ready;

    await application.bus.publish(application.events.create(TIMER_EVENTS.DEVICE_RUN_STOPPED, {
      ownerId: 'timer:one',
      deviceId: TIMER_DEVICE_IDS.KEYBOARD,
      elapsedMs: 500,
      steps: [],
    }));

    expect(requests).toEqual([]);
    await runtime.destroy();
    await application.destroy();
  });
});
