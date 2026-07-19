import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const handlerPath = fileURLToPath(new URL("./KeyboardInputHandler.svelte", import.meta.url));

describe("KeyboardInputHandler design contract", () => {
  it("uses Button props for primary play/pause/resume and danger cancel icon controls", () => {
    const source = readFileSync(handlerPath, "utf8");

    expect(source).not.toContain("TIMER_PRIMARY_CONTROL_BUTTON_CLASS");
    expect(source).not.toContain("TIMER_CANCEL_CONTROL_BUTTON_CLASS");
    expect(source).not.toContain("cdb-primary-icon-button");
    expect(source).not.toContain("cdb-danger-icon-button");
    expect(source).toContain('<Button type="primary" size="md" icon');
    expect(source).toContain('<Button type="danger" size="md" icon');
  });

  it("uses the normal Space start gesture when resuming from pause", () => {
    const source = readFileSync(handlerPath, "utf8");

    expect(source).toMatch(
      /else if \(\$timerState === TimerState\.PAUSE\) \{\s+\$device\.keyDownHandler\(\{ type: "keydown", code: "Space" \} as KeyboardEvent\);/
    );
  });
});
