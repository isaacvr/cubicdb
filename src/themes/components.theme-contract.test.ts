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
    expect(css).toContain(".cdb-icon-button");
    expect(css).toContain(".cdb-segmented-tabs");
    expect(css).toContain(".cdb-timer-display");
  });

  it("uses CubicDB semantic variables instead of hard-coded Tailwind scale names", () => {
    const css = readFileSync(componentsCssPath, "utf8");

    expect(css).toContain("var(--cdb-surface-panel,");
    expect(css).toContain("var(--cdb-radius-panel,");
    expect(css).toContain("var(--cdb-color-primary,");
    expect(css).not.toContain("green-500");
  });
});
