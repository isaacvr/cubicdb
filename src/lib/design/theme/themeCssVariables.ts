import type { AppThemeDefinition, ThemeCssVariables } from "./AppTheme";

function appendTypographyVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-font-app"] = theme.meta.appFont;
  variables["--cdb-font-timer"] = theme.meta.timerFont;
  variables["--cdb-font-mono"] = theme.meta.monoFont;
}

function appendSemanticVariables(theme: AppThemeDefinition, variables: ThemeCssVariables) {
  variables["--cdb-color-base"] = "var(--color-base-100)";
  variables["--cdb-color-base-soft"] =
    "color-mix(in oklab, var(--color-primary) 12%, transparent)";
  variables["--cdb-color-base-raised"] =
    "color-mix(in oklab, var(--color-primary) 18%, transparent)";
  variables["--cdb-color-base-content"] = "var(--color-base-content)";
  variables["--cdb-color-base-content-muted"] =
    "color-mix(in oklab, var(--color-base-content) 60%, transparent)";
  variables["--cdb-color-base-content-subtle"] =
    "color-mix(in oklab, var(--color-base-content) 40%, transparent)";
  variables["--cdb-color-primary"] = "var(--color-primary)";
  variables["--cdb-color-primary-content"] = "var(--color-primary-content)";
  variables["--cdb-color-primary-soft"] =
    "color-mix(in oklab, var(--color-primary) 12%, transparent)";
  variables["--cdb-color-primary-disabled"] =
    "color-mix(in oklab, var(--color-primary) 35%, var(--color-base-300))";
  variables["--cdb-color-secondary"] = "var(--color-secondary)";
  variables["--cdb-color-secondary-content"] = "var(--color-secondary-content)";
  variables["--cdb-color-accent"] = "var(--color-accent)";
  variables["--cdb-color-accent-content"] = "var(--color-accent-content)";
  variables["--cdb-color-info"] = "var(--color-info)";
  variables["--cdb-color-info-content"] = "var(--color-info-content)";
  variables["--cdb-color-success"] = "var(--color-success)";
  variables["--cdb-color-success-content"] = "var(--color-success-content)";
  variables["--cdb-color-warning"] = "var(--color-warning)";
  variables["--cdb-color-warning-content"] = "var(--color-warning-content)";
  variables["--cdb-color-error"] = "var(--color-error)";
  variables["--cdb-color-error-content"] = "var(--color-error-content)";
  variables["--cdb-color-border-subtle"] =
    "color-mix(in oklab, var(--color-primary) 12%, transparent)";
  variables["--cdb-color-border-visible"] =
    "color-mix(in oklab, var(--color-primary) 30%, transparent)";
  variables["--cdb-color-border-focus"] = "var(--color-primary)";
  variables["--cdb-color-overlay"] = theme.colors.overlay;

  variables["--cdb-surface-panel"] =
    "color-mix(in oklab, var(--color-primary) 12%, transparent)";
  variables["--cdb-surface-raised"] =
    "color-mix(in oklab, var(--color-primary) 18%, transparent)";
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
