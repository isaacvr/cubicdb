import { get } from 'svelte/store';
import type { TimerController } from '$lib/controllers/TimerController';
import type { SessionController } from '$lib/controllers/SessionController';
import type { SCRAMBLE_MENU } from '@constants';

export function useFilterManager(
  timerController: TimerController,
  sessionController: SessionController,
  MENU_DATA: SCRAMBLE_MENU[],
  pScrambleLib: any
) {
  const { mode, group, prob, filters, session } = timerController;

  function selectedGroup() {
    const _group = get(group);
    let _mode = get(mode);

    if (typeof _group === 'undefined') return;

    const modes = MENU_DATA[_group][1];
    mode.set(modes[0]);
    _mode = modes[0];

    if (_mode[1] === 'r3ni' || _mode[1] === 'r3') {
      prob.set(_mode[1] === 'r3ni' ? 2 : 5);
    }

    selectedMode(false);
  }

  async function selectedMode(saveMode = false, updateProb = true) {
    const _session = get(session);
    const _mode = get(mode);

    if (saveMode && _session.settings.sessionType === 'mixed') {
      const updated = await sessionController
        .applySettings(_session, { mode: _mode[1] } as any)
        .catch(() => null);
      if (updated) session.set(updated);
    }

    filters.set(pScrambleLib.filters.get(_mode[1]) || []);
    if (updateProb) prob.set(-1);
    await selectedFilter();
  }

  async function selectedFilter(saveFilter = false) {
    const _session = get(session);
    const _mode = get(mode);
    const _prob = get(prob);

    if (
      saveFilter &&
      (_session.settings.sessionType === 'mixed' || _mode[1] === 'r3' || _mode[1] === 'r3ni')
    ) {
      const updated = await sessionController
        .applySettings(_session, { prob: _prob } as any)
        .catch(() => null);
      if (updated) session.set(updated);
    }

    // Note: rescrambler should be handled by Timer.svelte effect
  }

  return {
    selectedGroup,
    selectedMode,
    selectedFilter,
  };
}
