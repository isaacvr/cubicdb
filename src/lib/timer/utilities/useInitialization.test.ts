import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { AverageSetting, Penalty, type Session, type Solve } from '@interfaces';
import { TimerController } from '$lib/controllers/TimerController';
import { useInitialization } from './useInitialization';

vi.mock('js-confetti', () => ({
  default: class JSConfetti {
    addConfetti = vi.fn();
  },
}));

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    _id: 'session:one',
    name: 'Session one',
    settings: {
      hasInspection: true,
      inspection: 15,
      showElapsedTime: true,
      calcAoX: AverageSetting.SEQUENTIAL,
      genImage: true,
      scrambleAfterCancel: false,
      withoutPrevention: false,
      input: 'keyboard',
    },
    ...overrides,
  };
}

function createSolve(overrides: Partial<Solve> = {}): Solve {
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

describe('useInitialization', () => {
  it('projects loaded solves for the selected session during setup', async () => {
    const timerController = new TimerController();
    const session = createSession();
    const otherSession = createSession({ _id: 'session:two', name: 'Session two' });
    const currentSolve = createSolve({ _id: 'current', session: session._id });
    const otherSolve = createSolve({ _id: 'other', session: otherSession._id });
    const sessionController = {
      sessions: { subscribe: vi.fn(), set: vi.fn(), update: vi.fn() },
    } as any;
    sessionController.sessions = {
      subscribe: vi.fn(run => {
        run([session, otherSession]);
        return () => {};
      }),
    };
    const solveController = {
      loadSolves: vi.fn(async () => []),
    };
    const loadSolves = vi.fn(async () => [currentSolve, otherSolve]);
    const initialization = useInitialization(
      timerController,
      sessionController,
      solveController as any,
      {},
      [
        ['3x3', [['3x3', '333', 20]]],
      ] as any,
      { params: { sessionId: session._id } },
      { initInputHandler: false, loadSolves },
    );

    initialization.setupOnMount();
    await vi.waitFor(() => expect(get(timerController.session)._id).toBe(session._id));

    expect(loadSolves).toHaveBeenCalledOnce();
    expect(solveController.loadSolves).not.toHaveBeenCalled();
    expect(get(timerController.allSolves).map(solve => solve._id)).toEqual(['current', 'other']);
    expect(get(timerController.solves).map(solve => solve._id)).toEqual(['current']);
  });
});
