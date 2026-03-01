import { get } from 'svelte/store';
import type { Session, SessionType } from '@interfaces';
import type { SessionController } from '$lib/controllers/SessionController';
import type { SCRAMBLE_MENU } from '@constants';
import type { TimerController } from '$lib/controllers/TimerController';

export function useSessionManager(
  timerController: TimerController,
  sessionController: SessionController,
  dataService: any,
  MENU_DATA: SCRAMBLE_MENU[]
) {
  const { session, mode, group, prob } = timerController;

  async function selectedSession() {
    const config = dataService.config;
    const _session = get(session);

    config.timer.session = _session._id;
    config.saveConfig();

    const targetMode = _session.settings.mode || '333';
    let fnd = false;

    for (let i = 0, maxi = MENU_DATA.length; i < maxi; i += 1) {
      const md = MENU_DATA[i][1].find(m => m[1] === targetMode);

      if (md) {
        mode.set(md);
        group.set(i);

        if (typeof _session.settings.prob === 'undefined') {
          // selectedMode will be called by caller
        } else {
          prob.set(_session.settings.prob);
        }

        fnd = true;
        break;
      }
    }

    if (!fnd) {
      mode.set(MENU_DATA[0][1][0]);
    }
  }

  async function newSession(
    name: string,
    type: SessionType,
    group: number,
    mode: number,
    steps: number,
    stepNames: string[]
  ) {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const settings = {
      sessionType: type,
    } as any;

    if (type === 'single' || type === 'multi-step') {
      settings.mode = MENU_DATA[group][1][mode][1];
    }

    if (type === 'multi-step') {
      settings.steps = steps;
      settings.stepNames = stepNames;
    }

    return sessionController.addSession({
      _id: '',
      name: trimmedName,
      settings,
    } as any);
  }

  function handleUpdateSession(updated: Session) {
    const sessionList = get(sessionController.sessions);
    const found = sessionList.find(s => s._id === updated._id);
    if (found) {
      found.name = updated.name;
      found.settings = updated.settings;
    }
  }

  return {
    selectedSession,
    newSession,
    handleUpdateSession,
  };
}
