import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const timerOptionsPath = fileURLToPath(new URL("./TimerOptions.svelte", import.meta.url));

describe("TimerOptions design contract", () => {
  it("keeps scramble action icon buttons as Figma ghost buttons instead of primary", () => {
    const source = readFileSync(timerOptionsPath, "utf8");

    expect(source).toContain('const TIMER_OPTION_BUTTON_COLOR = "ghost";');
    expect(source).toContain(
      'const TIMER_OPTION_BUTTON_CLASS = "cdb-action-icon-button size-8 min-h-8 p-0";'
    );
    expect(source).toContain("color={TIMER_OPTION_BUTTON_COLOR}");
    expect(source).toContain("class={TIMER_OPTION_BUTTON_CLASS}");
  });
});
