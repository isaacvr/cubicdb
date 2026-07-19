import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const drawerPath = fileURLToPath(new URL("./NavigationDrawer.svelte", import.meta.url));

describe("NavigationDrawer CubicDB design contract", () => {
  it("uses semantic side navigation classes with expanded and collapsed widths", () => {
    const source = readFileSync(drawerPath, "utf8");

    expect(source).toContain("cdb-side-nav");
    expect(source).toContain("data-collapsed={collapsed}");
    expect(source).not.toContain(
      'style="--cdb-side-nav-width-expanded: var(--cdb-side-nav-width-expanded);'
    );
  });

  it("marks active navigation items semantically for styling and accessibility", () => {
    const source = readFileSync(drawerPath, "utf8");

    expect(source).toContain("cdb-side-nav-item");
    expect(source).toContain('aria-current={isActive(href) ? "page" : undefined}');
    expect(source).toContain("data-active={isActive(href)}");
  });
});
