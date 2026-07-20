import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const themePath = fileURLToPath(new URL("./theme.cubicdb.css", import.meta.url));

describe("CubicDB theme tokens", () => {
  it("maps DaisyUI primary to the CubicDB primary token", () => {
    const css = readFileSync(themePath, "utf8");

    expect(css).toContain("--color-primary: #3abdf8;");
    expect(css).toContain("--cdb-color-primary: var(--color-primary);");
    expect(css).toContain("--cdb-color-base: var(--color-base-100);");
  });

  it("uses primary color for the active side navigation item", () => {
    const css = readFileSync(themePath, "utf8");

    expect(css).toContain("--cdb-side-nav-active-color: var(--cdb-color-primary);");
  });

  it("defines the default View Transition debugging duration", () => {
    const css = readFileSync(themePath, "utf8");

    expect(css).toContain("--cdb-view-transition-duration: 1000ms;");
  });
});
