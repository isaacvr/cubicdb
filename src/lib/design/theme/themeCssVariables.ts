import type { AppThemeDefinition, ThemeCssVariables } from "./AppTheme";

function appendTypographyVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-font-app"] = theme.meta.appFont;
  variables["--cdb-font-timer"] = theme.meta.timerFont;
  variables["--cdb-font-mono"] = theme.meta.monoFont;
}

function appendSemanticVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-color-base"] = theme.colors.base;
  variables["--cdb-color-base-soft"] = theme.colors.baseSoft;
  variables["--cdb-color-base-raised"] = theme.colors.baseRaised;
  variables["--cdb-color-base-content"] = theme.colors.baseContent;
  variables["--cdb-color-base-content-muted"] = theme.colors.baseContentMuted;
  variables["--cdb-color-base-content-subtle"] = theme.colors.baseContentSubtle;
  variables["--cdb-color-primary"] = theme.colors.primary;
  variables["--cdb-color-primary-content"] = theme.colors.primaryContent;
  variables["--cdb-color-primary-soft"] = theme.colors.primarySoft;
  variables["--cdb-color-primary-disabled"] = theme.colors.primaryDisabled;
  variables["--cdb-color-secondary"] = theme.colors.secondary;
  variables["--cdb-color-secondary-content"] = theme.colors.secondaryContent;
  variables["--cdb-color-accent"] = theme.colors.accent;
  variables["--cdb-color-accent-content"] = theme.colors.accentContent;
  variables["--cdb-color-info"] = theme.colors.info;
  variables["--cdb-color-info-content"] = theme.colors.infoContent;
  variables["--cdb-color-success"] = theme.colors.success;
  variables["--cdb-color-success-content"] = theme.colors.successContent;
  variables["--cdb-color-warning"] = theme.colors.warning;
  variables["--cdb-color-warning-content"] = theme.colors.warningContent;
  variables["--cdb-color-error"] = theme.colors.error;
  variables["--cdb-color-error-content"] = theme.colors.errorContent;
  variables["--cdb-color-border-subtle"] = theme.colors.borderSubtle;
  variables["--cdb-color-border-visible"] = theme.colors.borderVisible;
  variables["--cdb-color-border-focus"] = theme.colors.borderFocus;
  variables["--cdb-color-overlay"] = theme.colors.overlay;

  variables["--cdb-surface-panel"] = theme.colors.baseSoft;
  variables["--cdb-surface-raised"] = theme.colors.baseRaised;
}

function appendShapeVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-radius-control"] = theme.shape.control;
  variables["--cdb-radius-panel"] = theme.shape.panel;
  variables["--cdb-radius-modal"] = theme.shape.modal;
  variables["--cdb-radius-pill"] = theme.shape.pill;
}

function appendSpaceVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-space-xxs"] = theme.space.xxs;
  variables["--cdb-space-xs"] = theme.space.xs;
  variables["--cdb-space-sm"] = theme.space.sm;
  variables["--cdb-space-md"] = theme.space.md;
  variables["--cdb-space-lg"] = theme.space.lg;
  variables["--cdb-space-xl"] = theme.space.xl;
  variables["--cdb-space-panel"] = theme.space.panel;
}

function appendShadowVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-shadow-panel"] = theme.shadow.panel;
  variables["--cdb-shadow-modal"] = theme.shadow.modal;
  variables["--cdb-shadow-control"] = theme.shadow.control;
}

function appendBackgroundVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-background-base"] = theme.background.base;
  variables["--cdb-background-glow-a"] = theme.background.glowA;
  variables["--cdb-background-glow-b"] = theme.background.glowB;
  variables["--cdb-background-glow-c"] = theme.background.glowC;
}

function appendDaisyUiVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--color-base-100"] = theme.colors.base;
  variables["--color-base-200"] = theme.colors.baseSoft;
  variables["--color-base-300"] = theme.colors.baseRaised;
  variables["--color-base-content"] = theme.colors.baseContent;
  variables["--color-primary"] = theme.colors.primary;
  variables["--color-primary-content"] = theme.colors.primaryContent;
  variables["--color-secondary"] = theme.colors.secondary;
  variables["--color-secondary-content"] = theme.colors.secondaryContent;
  variables["--color-accent"] = theme.colors.accent;
  variables["--color-accent-content"] = theme.colors.accentContent;
  variables["--color-neutral"] = theme.colors.baseRaised;
  variables["--color-neutral-content"] = theme.colors.baseContent;
  variables["--color-info"] = theme.colors.info;
  variables["--color-info-content"] = theme.colors.infoContent;
  variables["--color-success"] = theme.colors.success;
  variables["--color-success-content"] = theme.colors.successContent;
  variables["--color-warning"] = theme.colors.warning;
  variables["--color-warning-content"] = theme.colors.warningContent;
  variables["--color-error"] = theme.colors.error;
  variables["--color-error-content"] = theme.colors.errorContent;
  variables["--radius-box"] = theme.shape.panel;
  variables["--radius-field"] = theme.shape.control;
  variables["--radius-selector"] = theme.shape.control;
}

export function createThemeCssVariables(theme: AppThemeDefinition): ThemeCssVariables {
  const variables: ThemeCssVariables = {};

  appendTypographyVariables(theme, variables);
  appendSemanticVariables(theme, variables);
  appendShapeVariables(theme, variables);
  appendSpaceVariables(theme, variables);
  appendShadowVariables(theme, variables);
  appendBackgroundVariables(theme, variables);
  appendDaisyUiVariables(theme, variables);

  return variables;
}

export function createThemeCssText(theme: AppThemeDefinition, selector = ":root"): string {
  const declarations = Object.entries(createThemeCssVariables(theme))
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n");

  return `${selector} {\n${declarations}\n}`;
}
