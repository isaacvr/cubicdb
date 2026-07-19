import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentsCssPath = fileURLToPath(new URL("./components.css", import.meta.url));

describe("CubicDB theme utility classes", () => {
  it("defines semantic utility classes for the design-system vertical slice", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-app-background");
    expect(css).toContain(".cdb-panel");
    expect(css).toContain(".cdb-panel-header");
    expect(css).toContain(".cdb-button-ghost");
    expect(css).toContain(".cdb-action-icon-button");
    expect(css).toContain(".cdb-icon-button");
    expect(css).toContain(".cdb-segmented-tabs");
    expect(css).toContain(".cdb-timer-display");
    expect(css).toContain(".cdb-range-field");
    expect(css).toContain(".cdb-side-nav");
  });

  it("uses CubicDB semantic variables instead of hard-coded Tailwind scale names", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain("var(--cdb-surface-panel,");
    expect(css).toContain("var(--cdb-radius-panel,");
    expect(css).toContain("var(--cdb-color-primary,");
    expect(css).toContain("var(--cdb-color-ready,");
    expect(css).not.toContain("green-500");
  });

  it("restores event-driven ready and prevention feedback for the timer display", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-timer-display.ready");
    expect(css).toContain(".cdb-timer-display.prevention:not(.ready)");
    expect(css).toContain("--cdb-timer-ready-glow");
  });

  it("keeps collapsed side navigation icons square and centered", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain('.cdb-side-nav[data-collapsed="true"] .cdb-side-nav-item');
    expect(css).toContain("width: var(--cdb-control-height-md, 2.5rem);");
    expect(css).toContain("height: var(--cdb-control-height-md, 2.5rem);");
    expect(css).toContain("justify-content: center;");
    expect(css).toContain("margin-inline: auto;");
    expect(css).toContain("display: none;");
  });

  it("uses dedicated side navigation colors while keeping labels readable", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain("color: var(--cdb-side-nav-item-color");
    expect(css).toContain("color: var(--cdb-side-nav-active-color");
    expect(css).toContain("color: var(--cdb-side-nav-support-color");
    expect(css).toContain("background: var(--cdb-side-nav-active-background");
  });

  it("matches Figma small icon action buttons at 32px square", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-action-icon-button");
    expect(css).toContain("width: 2rem;");
    expect(css).toContain("height: 2rem;");
    expect(css).toContain("padding: 0;");
  });

  it("matches Figma primary timer action buttons at 40px square with primary fill", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-primary-icon-button");
    expect(css).toContain("width: 2.5rem;");
    expect(css).toContain("height: 2.5rem;");
    expect(css).toContain("background: var(--cdb-color-primary");
    expect(css).toContain("color: var(--cdb-color-primary-content");
  });

  it("styles destructive timer controls as red 40px icon buttons", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-danger-icon-button");
    expect(css).toContain("width: 2.5rem;");
    expect(css).toContain("height: 2.5rem;");
    expect(css).toContain("background: var(--cdb-color-prevention");
    expect(css).toContain("color: var(--cdb-color-base-content");
  });

  it("matches Figma ghost button behavior with transparent default and soft hover fill", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain(".cdb-button-ghost");
    expect(css).toContain("background: transparent;");
    expect(css).toContain(".cdb-button-ghost:hover");
    expect(css).toContain("background: var(--cdb-button-ghost-hover-background");
  });
});
