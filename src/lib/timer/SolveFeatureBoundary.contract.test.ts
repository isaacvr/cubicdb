import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("solve feature boundary", () => {
  it("keeps component access behind the runtime facade", () => {
    const hookSource = read("./solves/useSolve.ts");
    const featureSource = [
      read("./solves/SolveFeature.ts"),
      read("./solves/SolveProjection.svelte.ts"),
      hookSource,
    ].join("\n");

    expect(featureSource).not.toMatch(/dataService|SolveController|solveIPC\.(browser|electron)/);
    expect(hookSource).toContain("getTimerRuntimeContext");
    expect(hookSource).toContain("getSolveFeature");
  });

  it("documents History as the next facade migration boundary", () => {
    const historySource = read("./HistoryTab/HistoryTab.svelte");

    expect(historySource).toContain("context: TimerContext");
    expect(historySource).not.toContain("useSolve(");
  });
});
