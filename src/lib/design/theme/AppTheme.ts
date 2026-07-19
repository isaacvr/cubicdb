export interface AppThemeDefinition {
  meta: {
    id: string;
    name: string;
    version: number;
    appFont: string;
    timerFont: string;
    monoFont: string;
  };
  colors: {
    base: string;
    baseSoft: string;
    baseRaised: string;
    baseContent: string;
    baseContentMuted: string;
    baseContentSubtle: string;
    primary: string;
    primaryContent: string;
    primarySoft: string;
    primaryDisabled: string;
    secondary: string;
    secondaryContent: string;
    accent: string;
    accentContent: string;
    info: string;
    infoContent: string;
    success: string;
    successContent: string;
    warning: string;
    warningContent: string;
    error: string;
    errorContent: string;
    borderSubtle: string;
    borderVisible: string;
    borderFocus: string;
    overlay: string;
  };
  shape: {
    control: string;
    panel: string;
    modal: string;
    pill: string;
  };
  space: {
    xxs: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    panel: string;
  };
  shadow: {
    panel: string;
    modal: string;
    control: string;
  };
  background: {
    base: string;
    glowA: string;
    glowB: string;
    glowC: string;
  };
}

export type ThemeCssVariables = Record<`--${string}`, string>;
