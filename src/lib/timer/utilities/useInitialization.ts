import { get } from 'svelte/store';
import type { TimerController } from '$lib/controllers/TimerController';
import type { SessionController } from '$lib/controllers/SessionController';
import type { SolveController } from '$lib/controllers/SolveController';
import type { SCRAMBLE_MENU } from '@constants';
import { SelectSession } from '$lib/core/usecases/SelectSession';

export function useInitialization(
  timerController: TimerController,
  sessionController: SessionController,
  solveController: SolveController,
  dataService: any,
  MENU_DATA: SCRAMBLE_MENU[],
  page: any,
  options?: { battle?: boolean; timerOnly?: boolean; scrambleOnly?: boolean }
) {
  const { session, group, mode, prob, allSolves } = timerController;

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

    const ss = page?.params?.sessionId;
    const currentSession = sessions.find(s => s._id === ss);
    session.set(currentSession || sessions[0]);

    // select mode/group/prob using the use-case
    const selector = new SelectSession();
    const res = selector.execute(get(session), MENU_DATA as any);

    group.set(res.groupIndex);
    mode.set(res.mode as any);
    if (typeof res.prob !== 'undefined') prob.set(res.prob);

    initInputHandler(get(session).settings.input || '');

    updateSessionsIcons();
    // No call selectedSession here - let caller handle
  }

  async function initInputHandler(id: string) {
    const { device } = timerController;
    const { devices } = await import('@stores/devices.store');
    const devicesVal = get(devices);

    device.set(devicesVal.find(d => d.id === id) || devicesVal[0]);
    devicesVal.forEach(d => (d.enabled = false));
    get(device).init(null as any); // InputContext will be passed separately
  }

  function setupOnMount() {
    if (!(options?.battle || options?.timerOnly || options?.scrambleOnly)) {
      // Use controller to load solves; controller uses the GetSolves use-case + adapter
      solveController.loadSolves().then(sv => {
        allSolves.set(sv);

        const sessions = get(sessionController.sessions);
        sessions.forEach(s => (s.tName = s.name));

        if (sessions.length === 0) {
          // New session flow - handled by caller
          return;
        }

        updateCurrentSession();
      });
    }
  }

  return {
    setupOnMount,
    updateCurrentSession,
    updateSessionsIcons,
    initInputHandler,
  };
}
