import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const buttonPath = fileURLToPath(new URL("./Button.svelte", import.meta.url));
const buttonTypesPath = fileURLToPath(new URL("./Button.types.ts", import.meta.url));

describe("Button design-system contract", () => {
  it("uses Figma type and size props with app semantic extensions", () => {
    const source = readFileSync(buttonPath, "utf8");
    const types = readFileSync(buttonTypesPath, "utf8");

    expect(types).toContain('| "primary"');
    expect(types).toContain('| "secondary"');
    expect(types).toContain('| "tertiary"');
    expect(types).toContain('| "danger"');
    expect(types).toContain('| "warning"');
    expect(types).toContain('| "success"');
    expect(types).toContain('| "info"');
    expect(types).toContain('| "accent"');
    expect(types).toContain('type ButtonSize = "xs" | "sm" | "md" | "lg";');
    expect(source).toContain("buttonType?: ButtonNativeType;");
    expect(source).toContain("icon?: boolean;");
    expect(source).not.toContain("color?:");
    expect(source).not.toContain("file?:");
    expect(source).not.toContain("COLOR_TYPE_ALIAS");
    expect(source).toContain("let sharedAttributes = $derived({");
    expect(source).toContain('"data-type": type');
    expect(source).toContain('"data-size": size');
    expect(source).toContain('"data-icon": icon');
    expect(source).not.toContain("keydown: KeyboardEvent");
    expect(source).not.toContain("handleKeydown");
  });
});
