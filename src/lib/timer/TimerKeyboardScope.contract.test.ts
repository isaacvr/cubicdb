import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("timer keyboard input scope", () => {
  it("does not mount the timer keyboard boundary in the application layout", () => {
    const layout = source("src/routes/+layout.svelte");

    expect(layout).not.toContain("<TimerKeyboardEventBoundary");
  });

  it("mounts the keyboard boundary from the timer view behind timer-tab scope", () => {
    const timer = source("src/lib/timer/Timer.svelte");

    expect(timer).toContain("TimerKeyboardEventBoundary");
    expect(timer).toContain("shouldProcessTimerKeyboardInput");
  });
});
