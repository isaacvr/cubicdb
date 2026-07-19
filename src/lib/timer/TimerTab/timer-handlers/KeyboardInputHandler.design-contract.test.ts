import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const handlerPath = fileURLToPath(new URL("./KeyboardInputHandler.svelte", import.meta.url));

describe("KeyboardInputHandler design contract", () => {
  it("uses primary play/pause/resume and red cancel controls with matching timer-control dimensions", () => {
    const source = readFileSync(handlerPath, "utf8");

    expect(source).toContain('const TIMER_PRIMARY_CONTROL_BUTTON_COLOR = "primary";');
    expect(source).toContain(
      'const TIMER_PRIMARY_CONTROL_BUTTON_CLASS = "cdb-primary-icon-button size-10 min-h-10 p-0";'
    );
    expect(source).toContain('const TIMER_CANCEL_CONTROL_BUTTON_COLOR = "error";');
    expect(source).toContain(
      'const TIMER_CANCEL_CONTROL_BUTTON_CLASS = "cdb-danger-icon-button size-10 min-h-10 p-0";'
    );
    expect(source).toContain("color={TIMER_PRIMARY_CONTROL_BUTTON_COLOR}");
    expect(source).toContain("class={TIMER_PRIMARY_CONTROL_BUTTON_CLASS}");
    expect(source).toContain("color={TIMER_CANCEL_CONTROL_BUTTON_COLOR}");
    expect(source).toContain("class={TIMER_CANCEL_CONTROL_BUTTON_CLASS}");
    expect(source).toContain(
      "{#if $timerState === TimerState.RUNNING}\n      <Button\n        color={TIMER_PRIMARY_CONTROL_BUTTON_COLOR}"
    );
    expect(source).not.toContain("TIMER_SECONDARY_CONTROL_BUTTON_COLOR");
    expect(source).not.toContain("TIMER_SECONDARY_CONTROL_BUTTON_CLASS");
    expect(source).toContain(
      "{:else if $timerState === TimerState.PAUSE}\n      <Button\n        color={TIMER_PRIMARY_CONTROL_BUTTON_COLOR}"
    );
  });

  it("uses the normal Space start gesture when resuming from pause", () => {
    const source = readFileSync(handlerPath, "utf8");

    expect(source).toMatch(
      /else if \(\$timerState === TimerState\.PAUSE\) \{\s+\$device\.keyDownHandler\(\{ type: "keydown", code: "Space" \} as KeyboardEvent\);/
    );
  });
});
