import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TimerOptions scramble tooltips", () => {
  it("keeps the session settings tooltip inside the right viewport edge", () => {
    const source = readFileSync(new URL("./TimerOptions.svelte", import.meta.url), "utf8");
    const sessionSettingsBlock = source.match(
      /\{#if options\.sessionSettings\}([\s\S]*?)\{\/if\}/
    )?.[1];

    expect(sessionSettingsBlock).toContain('placement="bottom-end"');
    expect(sessionSettingsBlock).toContain('class="z-30"');
  });

  it("places each scramble action tooltip inside the visible panel", () => {
    const source = readFileSync(new URL("./TimerOptions.svelte", import.meta.url), "utf8");
    const actionTooltips = source.match(
      /<Tooltip[^>]*tooltipText=\{\$localLang\.(?:global\.toScramble|TIMER\.(?:copyScramble|edit|useOldScramble))\}[^>]*>/g
    );

    expect(actionTooltips).toHaveLength(4);
    for (const tooltip of actionTooltips ?? []) {
      expect(tooltip).toContain('placement="bottom-end"');
      expect(tooltip).toContain('class="z-30"');
    }
  });
});
