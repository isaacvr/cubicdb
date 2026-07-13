import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cubicdb DaisyUI theme", () => {
  it("defines the neutral colors required by DaisyUI tooltips", () => {
    const theme = readFileSync(new URL("./theme.cubicdb.css", import.meta.url), "utf8");

    expect(theme).toMatch(/--color-neutral:\s*oklch\([^)]+\)/);
    expect(theme).toMatch(/--color-neutral-content:\s*oklch\([^)]+\)/);
  });
});
