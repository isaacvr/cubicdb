import { get } from 'svelte/store';
import type { TimerController } from '$lib/controllers/TimerController';
import type { SessionController } from '$lib/controllers/SessionController';
import type { SolveController } from '$lib/controllers/SolveController';
import type { SCRAMBLE_MENU } from '@constants';
import { SelectSession } from '$lib/core/usecases/SelectSession';
import type { Solve } from '@interfaces';

function normalizeSessionId(sessionId: unknown): string | number | undefined {
  if (typeof sessionId === 'number') return sessionId;
  if (typeof sessionId === 'string' && /^-?\d+$/.test(sessionId)) return Number(sessionId);
  if (typeof sessionId === 'string') return sessionId;
  return undefined;
}

interface InitializationOptions {
  battle?: boolean;
  timerOnly?: boolean;
  scrambleOnly?: boolean;
  initInputHandler?: boolean;
  loadSolves?: () => Promise<Solve[]>;
}

export function useInitialization(
  timerController: TimerController,
  sessionController: SessionController,
  solveController: SolveController,
  dataService: any,
  MENU_DATA: SCRAMBLE_MENU[],
  page: any,
  options?: InitializationOptions
) {
  const { session, group, mode, prob, allSolves } = timerController;
  let sessionsReadyUnsubscribe: (() => void) | null = null;

  async function updateSessionsIcons() {
    const { ICONS } = await import('@constants');
    const sessions = get(sessionController.sessions);

    for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
      if (sessions[i].settings?.sessionType != 'mixed') {
        for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
          if (Array.isArray(ICONS[j].scrambler)) {
            if (
              (ICONS[j].scrambler as string[]).some(
                s => sessions[i].settings && s === sessions[i].settings.mode
              )
            ) {
              sessions[i].icon = ICONS[j];
              break;
            }
          } else if (sessions[i].settings && ICONS[j].scrambler === sessions[i].settings.mode) {
            sessions[i].icon = ICONS[j];
            break;
          }
        }
      }
    }
  }

  function updateCurrentSession() {
    const sessions = get(sessionController.sessions);
    sessions.forEach(s => (s.tName = s.name.toLowerCase()));
    setTimeout(() => sessions.sort((a, b) => a.tName?.localeCompare(b.tName || '') || 0), 1000);

    const ss = normalizeSessionId(page?.params?.sessionId);
    const currentSession = sessions.find(s => normalizeSessionId(s._id) === ss);
    session.set(currentSession || sessions[0]);

    // select mode/group/prob using the use-case
    const selector = new SelectSession();
    const res = selector.execute(get(session), MENU_DATA as any);

    group.set(res.groupIndex);
    mode.set(res.mode as any);
    if (typeof res.prob !== 'undefined') prob.set(res.prob);

    if (options?.initInputHandler !== false) {
      initInputHandler(get(session).settings.input || '');
    }

    updateSessionsIcons();
    // No call selectedSession here - let caller handle
  }

  async function initInputHandler(id: string) {
    const { device } = timerController;
    const { devices } = await import('@stores/devices.store');
    const devicesVal = get(devices);

    device.set(devicesVal.find(d => d.id === id) || devicesVal[0]);
    devicesVal.forEach(d => (d.enabled = false));
    get(device).init({ timerController } as any); // InputContext will be passed separately
  }

  function setupOnMount() {
    if (!(options?.battle || options?.timerOnly || options?.scrambleOnly)) {
      const loadSolves = options?.loadSolves ?? (() => solveController.loadSolves());
      loadSolves().then(sv => {
        allSolves.set(sv);
        projectLoadedSolvesWhenSessionsAreReady();
      });
    }
  }

  function projectLoadedSolvesWhenSessionsAreReady() {
    sessionsReadyUnsubscribe?.();
    let unsubscribe: (() => void) | null = null;
    unsubscribe = sessionController.sessions.subscribe(sessions => {
      sessions.forEach(s => (s.tName = s.name));

      if (sessions.length === 0) return;

      updateCurrentSession();
      timerController.updateSolves();
      timerController.updateStatistics(true);
      queueMicrotask(() => {
        unsubscribe?.();
        if (sessionsReadyUnsubscribe === unsubscribe) sessionsReadyUnsubscribe = null;
      });
    });
    sessionsReadyUnsubscribe = unsubscribe;
  }

  return {
    setupOnMount,
    updateCurrentSession,
    updateSessionsIcons,
    initInputHandler,
  };
}
