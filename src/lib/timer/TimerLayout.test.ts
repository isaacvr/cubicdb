import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("timer grid layouts", () => {
  it("defines explicit valid rows for the timer shell and scramble panel", () => {
    const timer = read("./Timer.svelte");
    const timerTab = read("./TimerTab/TimerTab.svelte");

    expect(timer).toContain("grid-template-rows: 2rem minmax(0, 1fr)");
    expect(timerTab).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(timer).not.toContain("grid-rows-[2rem,1fr]");
    expect(timerTab).not.toContain("grid-rows-[auto_1fr]");
  });

  it("defines explicit valid rows for the timer sessions page", () => {
    const sessionsPage = read("../../routes/timer/+page.svelte");

    expect(sessionsPage).toContain("grid-template-rows: 2rem minmax(0, 1fr)");
    expect(sessionsPage).not.toContain("grid-rows-[2rem,1fr]");
  });
});
