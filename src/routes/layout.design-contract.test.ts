import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layoutPath = fileURLToPath(new URL("./+layout.svelte", import.meta.url));

describe("application layout design contract", () => {
  it("uses one full-width navbar row above sidebar and content", () => {
    const source = readFileSync(layoutPath, "utf8");

    expect(source).toContain('class="layout cdb-app-background"');
    expect(source).toContain(
      'grid-template-areas:\n      "navbar navbar"\n      "navigation content"'
    );
    expect(source).toContain('<div class="navbar-shell draggable custom-cursor">');
    expect(source).not.toContain("topbarLogo");
    expect(source).not.toContain("topbarContent");
  });

  it("binds navigation collapse state into the shell grid", () => {
    const source = readFileSync(layoutPath, "utf8");

    expect(source).toContain("let navigationCollapsed = $state(false)");
    expect(source).toContain("data-navigation-collapsed={navigationCollapsed}");
    expect(source).toContain("bind:collapsed={navigationCollapsed}");
  });

  it("uses explicit theme widths for expanded and collapsed navigation grid columns", () => {
    const source = readFileSync(layoutPath, "utf8");

    expect(source).toContain(
      "grid-template-columns: var(--cdb-side-nav-width-expanded) minmax(0, 1fr);"
    );
    expect(source).toContain('.layout[data-navigation-collapsed="true"]');
    expect(source).toContain(
      "grid-template-columns: var(--cdb-side-nav-width-collapsed) minmax(0, 1fr);"
    );
  });
});
