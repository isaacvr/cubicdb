import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dropdownPath = fileURLToPath(new URL("./Dropdown.svelte", import.meta.url));

describe("Dropdown contracts", () => {
  it("floats above modal content instead of expanding modal scroll areas", () => {
    const source = readFileSync(dropdownPath, "utf8");

    expect(source).toContain("function updateFloatingPosition");
    expect(source).toContain("getBoundingClientRect");
    expect(source).toContain("class=\"fixed z-[1100]");
    expect(source).toContain("style={floatingStyle}");
    expect(source).not.toContain("class=\"absolute z-50");
  });
});
