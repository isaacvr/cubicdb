import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readTimerFile(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

describe("timer design-system vertical slice", () => {
  it("uses the semantic app background and segmented tabs in Timer.svelte", () => {
    const source = readTimerFile("./Timer.svelte");

    expect(source).toContain("SegmentedTabs");
    expect(source).toContain("cdb-app-background");
    expect(source).toContain("timer-layout");
  });

  it("uses design panels and icon buttons in TimerTab.svelte", () => {
    const source = readTimerFile("./TimerTab/TimerTab.svelte");

    expect(source).toContain("Panel");
    expect(source).toContain("IconButton");
    expect(source).toContain("cdb-timer-display");
    expect(source).toContain('title={$localLang.global.scramble}');
    expect(source).toContain('title={$localLang.HOME.timer}');
  });
});
