import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SRC_ROOT = join(ROOT, "src");
const BUTTON_OPENING_TAG_PATTERN = /<Button\b[^>]*>/g;
const DIRECT_BUTTON_STYLE_PATTERN =
  /\b(?:btn-|bg-|!bg-|hover:bg-|text-gray-|w-(?:8|10)\b|h-(?:8|10)\b|!p-|p-(?:0|1|2|3)\b|rounded-full|border-primary|bg-cancelButton|bg-urgentButton)\b/;

function listSvelteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSvelteFiles(path);
    }

    return entry.isFile() && entry.name.endsWith(".svelte") ? [path] : [];
  });
}

describe("Button usage design-system contract", () => {
  it("does not use the legacy color prop", () => {
    const offenders = listSvelteFiles(SRC_ROOT).flatMap(file => {
      const source = readFileSync(file, "utf8");
      const matches = source.match(/<Button\b[^>]*\bcolor=/g) ?? [];
      return matches.map(match => `${file.replace(ROOT, "")}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps file input behavior out of Button", () => {
    const offenders = listSvelteFiles(SRC_ROOT).flatMap(file => {
      const source = readFileSync(file, "utf8");
      const matches = source.match(/<Button\b[^>]*\bfile(?:=|\s|>)/g) ?? [];
      return matches.map(match => `${file.replace(ROOT, "")}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps Button visual styling controlled by type, size, and icon props", () => {
    const offenders = listSvelteFiles(SRC_ROOT).flatMap(file => {
      if (file.endsWith(join("src", "lib", "cubicdbKit", "Button.svelte"))) {
        return [];
      }

      const source = readFileSync(file, "utf8");
      return Array.from(source.matchAll(BUTTON_OPENING_TAG_PATTERN))
        .map(match => ({
          block: match[0],
          token: match[0].match(DIRECT_BUTTON_STYLE_PATTERN)?.[0],
        }))
        .filter(match => match.token)
        .map(
          match =>
            `${file.replace(ROOT, "")}: ${match.token} in ${match.block
              .replace(/\s+/g, " ")
              .slice(0, 160)}`
        );
    });

    expect(offenders).toEqual([]);
  });
});
