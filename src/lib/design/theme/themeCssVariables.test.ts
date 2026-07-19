import { describe, expect, it } from "vitest";
import { CUBICDB_THEME } from "./cubicdbTheme";
import { createThemeCssText, createThemeCssVariables } from "./themeCssVariables";

describe("CubicDB semantic theme", () => {
  it("is JSON serializable without losing role names", () => {
    const serialized = JSON.stringify(CUBICDB_THEME);
    const parsed = JSON.parse(serialized);

    expect(parsed.meta.id).toBe("cubicdb.theme.default");
    expect(parsed.colors.primary).toBe("#3abdf8");
    expect(parsed.colors.baseRaised).toBe("rgba(58, 189, 248, 0.1)");
    expect(parsed.colors).not.toHaveProperty("green-500");
    expect(parsed.colors).not.toHaveProperty("primary-500");
  });

  it("emits semantic CubicDB variables and DaisyUI compatibility variables", () => {
    const variables = createThemeCssVariables(CUBICDB_THEME);

    expect(variables["--cdb-color-primary"]).toBe("#3abdf8");
    expect(variables["--cdb-surface-panel"]).toBe("rgba(58, 189, 248, 0.05)");
    expect(variables["--cdb-radius-panel"]).toBe("12px");
    expect(variables["--color-primary"]).toBe("#3abdf8");
    expect(variables["--color-base-100"]).toBe("#061319");
    expect(variables["--radius-box"]).toBe("12px");
  });

  it("creates CSS text that can be mounted under a selector", () => {
    const css = createThemeCssText(CUBICDB_THEME, '[data-theme="cubicdb"]');

    expect(css).toContain('[data-theme="cubicdb"]');
    expect(css).toContain("--cdb-color-primary: #3abdf8;");
    expect(css).toContain("--color-primary: #3abdf8;");
  });
});
