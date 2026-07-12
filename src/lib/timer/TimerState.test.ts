import { describe, expect, it } from 'vitest';
import { Penalty, TimerState as TimerStateValue } from '@interfaces';
import { TimerState } from './TimerState.svelte';

describe('TimerState', () => {
  it('resets transient solve state while retaining session data', () => {
    const state = new TimerState();
    state.timerState = TimerStateValue.STOPPED;
    state.time = 1234;
    state.ready = true;
    state.decimals = false;
    state.steps = [400, 834];
    state.penalty = Penalty.P2;
    state.dnfFromInspection = true;

    state.reset();

    expect(state.timerState).toBe(TimerStateValue.CLEAN);
    expect(state.time).toBe(0);
    expect(state.ready).toBe(false);
    expect(state.decimals).toBe(true);
    expect(state.steps).toEqual([]);
    expect(state.penalty).toBe(Penalty.NONE);
    expect(state.dnfFromInspection).toBe(false);
  });
});
