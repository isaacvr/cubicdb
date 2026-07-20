import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const statsTabPath = fileURLToPath(new URL("./StatsTab.svelte", import.meta.url));

describe("StatsTab contracts", () => {
  it("initializes all statistics charts when the statistics tab is visible", () => {
    const source = readFileSync(statsTabPath, "utf8");

    expect(source).toContain("initGraphs($solves, headless || $tab !== 2)");
    expect(source).not.toContain("initGraphs($solves, true)");
    expect(source).toContain("if (!headless && $tab !== 2) return");
    expect(source).toContain("hourChart = echarts.init");
    expect(source).toContain("weekChart = echarts.init");
    expect(source).toContain("distChart = echarts.init");
  });

  it("guards hidden-tab resize and histogram updates", () => {
    const source = readFileSync(statsTabPath, "utf8");

    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("if (!distChart || distChart.isDisposed()) return");
    expect(source).toContain("!Number.isFinite($stats.best.value)");
    expect(source).toContain("const index = between");
  });

  it("uses DaisyUI/CubicDB CSS variables instead of the old theme service for chart colors", () => {
    const source = readFileSync(statsTabPath, "utf8");

    expect(source).toContain('cssVar("--color-base-content"');
    expect(source).toContain('cssVar("--color-primary"');
    expect(source).toContain("getTooltipStyle");
    expect(source).not.toContain("dataService.theme.currentTheme.colors.text");
  });

  it("lets best marks navigate to History and select the matching solve", () => {
    const source = readFileSync(statsTabPath, "utf8");

    expect(source).toContain("function goToBestMark");
    expect(source).toContain("$tab = 1");
    expect(source).toContain("selectSolveById(id, select)");
    expect(source).toContain('type="tertiary"');
    expect(source).toContain("best-mark-button");
  });
});
