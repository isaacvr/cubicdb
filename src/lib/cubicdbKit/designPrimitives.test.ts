import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readComponent(name: string) {
  return readFileSync(fileURLToPath(new URL(`./${name}.svelte`, import.meta.url)), "utf8");
}

describe("CubicDB design primitives", () => {
  it("Panel exposes title, actions and semantic panel classes", () => {
    const source = readComponent("Panel");

    expect(source).toContain("title?");
    expect(source).toContain("actions?");
    expect(source).toContain("cdb-panel");
    expect(source).toContain("cdb-panel-header");
    expect(source).toContain("cdb-panel-title");
  });

  it("IconButton accepts lucide-style icon components and semantic variants", () => {
    const source = readComponent("IconButton");

    expect(source).toContain("icon:");
    expect(source).toContain('variant?: "ghost" | "primary"');
    expect(source).toContain("aria-label={label}");
    expect(source).toContain("cdb-icon-button");
    expect(source).toContain("data-variant={variant}");
  });

  it("SegmentedTabs renders accessible tabs from item definitions", () => {
    const source = readComponent("SegmentedTabs");

    expect(source).toContain("items:");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain("aria-selected");
    expect(source).toContain("cdb-segmented-tabs");
  });
});
