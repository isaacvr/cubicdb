import type { Session } from "@interfaces";
import type { SCRAMBLE_MENU } from "@constants";

export type SelectedSessionResult = {
  groupIndex: number;
  mode: [string, string, number];
  prob?: number | number[];
};

/**
 * Pure use-case: given a session and the MENU, determine the group index,
 * the mode tuple and the probability value to apply.
 */
export class SelectSession {
  execute(session: Session, MENU: SCRAMBLE_MENU[]): SelectedSessionResult {
    const result: SelectedSessionResult = {
      groupIndex: 0,
      mode: ((MENU[0] && MENU[0][1] && (MENU[0][1][0] as any)) || ["", "", 0]) as any,
      prob: undefined,
    };

    const targetMode = session?.settings?.mode || "333";

    let found = false;

    for (let i = 0; i < MENU.length; i += 1) {
      const modes = MENU[i][1];
      for (let j = 0; j < modes.length; j += 1) {
        const md = modes[j];
        if (md[1] === targetMode) {
          result.groupIndex = i;
          result.mode = md as any;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // fallback: first mode of MENU
    if (!found) {
      result.mode = ((MENU[0] && MENU[0][1] && (MENU[0][1][0] as any)) || result.mode) as any;
    }

    // determine prob: if session defines it, use it, otherwise use heuristics
    if (typeof session?.settings?.prob !== "undefined") {
      result.prob = session.settings.prob;
    } else if (result.mode && (result.mode[1] === "r3" || result.mode[1] === "r3ni")) {
      result.prob = result.mode[1] === "r3ni" ? 2 : 5;
    }

    return result;
  }
}
