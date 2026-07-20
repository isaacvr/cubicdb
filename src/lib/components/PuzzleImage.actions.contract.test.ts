import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const puzzleImagePath = fileURLToPath(new URL("./PuzzleImage.svelte", import.meta.url));

describe("PuzzleImage helper actions", () => {
  it("makes download, copy image, and copy code helper buttons directly actionable with tooltips", () => {
    const source = readFileSync(puzzleImagePath, "utf8");

    expect(source).toContain("tooltipText={$localLang.global.download}");
    expect(source).toContain("onclick={() => handleDownload(1)}");
    expect(source).toContain("tooltipText={$localLang.global.copy}");
    expect(source).toContain("onclick={() => handleCopy(1)}");
    expect(source).toContain('tooltipText={replaceParams($localLang.global.copyCode, ["SVG"])}');
    expect(source).toContain("onclick={handleCopyCode}");
    expect(source).toContain("puzzle-img relative");
    expect(source).toContain("absolute top-2 right-2 z-10");
  });
});
