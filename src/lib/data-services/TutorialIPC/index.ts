import { browser } from "$app/environment";
import { TutorialBrowserIPC } from "./tutorialIPC.browser";
import { TutorialElectronIPC } from "./tutorialIPC.electron";
import { TutorialNoopIPC } from "./tutorialIPC.noop";

export function getTutorialIPC() {
  if (browser) {
    // @ts-ignore
    if (window.electronAPI) {
      return TutorialElectronIPC.getInstance();
    }
    return TutorialBrowserIPC.getInstance();
  }

  return TutorialNoopIPC.getInstance();
}
