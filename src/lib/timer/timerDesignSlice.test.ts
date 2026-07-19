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

  it("keeps the active timer tab bound to the reactive tab store", () => {
    const source = readTimerFile("./Timer.svelte");

    expect(source).toContain("const tabStore = timerController.tab");
    expect(source).toContain("selected={String($tabStore)}");
    expect(source).not.toContain("selected={String(get(timerController.tab))}");
  });

  it("uses design panels and icon buttons in TimerTab.svelte", () => {
    const source = readTimerFile("./TimerTab/TimerTab.svelte");

    expect(source).toContain("Panel");
    expect(source).toContain("IconButton");
    expect(source).toContain("title={$localLang.global.scramble}");
    expect(source).toContain("title={$localLang.HOME.timer}");
  });

  it("uses Figma-aligned timer number classes for integer and decimal parts", () => {
    const source = readTimerFile("./TimerTab/timer-handlers/KeyboardInputHandler.svelte");

    expect(source).toContain("cdb-timer-display");
    expect(source).toContain("cdb-timer-display-main");
    expect(source).toContain("cdb-timer-display-fraction");
    expect(source).toContain("class:ready={$ready}");
    expect(source).toContain("class:prevention={$timerState === TimerState.PREVENTION}");
    expect(source).not.toContain("text-8xl");
  });
});
