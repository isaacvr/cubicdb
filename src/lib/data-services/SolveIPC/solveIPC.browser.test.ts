import { describe, expect, it } from 'vitest';
import { Penalty, type Solve } from '@interfaces';
import { filterSolvesByQuery, normalizeSessionId } from './solveIPC.browser';

function solve(overrides: Partial<Solve> = {}): Solve {
  return {
    _id: 'solve:one',
    time: 1000,
    date: 1000,
    scramble: 'R U',
    penalty: Penalty.NONE,
    selected: false,
    session: 'session:one',
    ...overrides,
  };
}

describe('filterSolvesByQuery', () => {
  it('returns all solves when no query is provided', () => {
    const solves = [
      solve({ _id: 'one', session: 'session:one' }),
      solve({ _id: 'two', session: 'session:two' }),
    ];

    expect(filterSolvesByQuery(solves)).toEqual(solves);
  });

  it('returns only solves for the requested session', () => {
    const first = solve({ _id: 'one', session: 'session:one' });
    const second = solve({ _id: 'two', session: 'session:two' });

    expect(filterSolvesByQuery([first, second], { sessionId: 'session:one' })).toEqual([first]);
  });

  it('matches route string session ids against legacy numeric solve session ids', () => {
    const first = solve({ _id: 'one', session: 1 as any });
    const second = solve({ _id: 'two', session: 2 as any });

    expect(filterSolvesByQuery([first, second], { sessionId: '1' })).toEqual([first]);
    expect(normalizeSessionId('1')).toBe(1);
  });
});
