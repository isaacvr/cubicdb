import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const timerOptionsPath = fileURLToPath(new URL("./TimerOptions.svelte", import.meta.url));

describe("TimerOptions design contract", () => {
  it("uses Button props for tertiary sm icon buttons instead of direct visual classes", () => {
    const source = readFileSync(timerOptionsPath, "utf8");

    expect(source).not.toContain("TIMER_OPTION_BUTTON_COLOR");
    expect(source).not.toContain("TIMER_OPTION_BUTTON_CLASS");
    expect(source).not.toContain("cdb-action-icon-button");
    expect(source).toContain('type="tertiary"');
    expect(source).toContain('size="sm"');
    expect(source).toContain("icon");
  });
});
