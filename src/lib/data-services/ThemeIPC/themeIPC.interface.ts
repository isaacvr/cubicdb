import type { Theme } from "@interfaces";

export interface ThemeIPC {
  getTheme: () => Theme;
  applyTheme: (t: Theme) => void;
}
