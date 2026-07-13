import { createRawSnippet } from "svelte";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import Tooltip from "./Tooltip.svelte";

describe("Tooltip", () => {
  it("renders the DaisyUI tooltip content and target in the same wrapper", () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Save</button>',
    }));

    const { body } = render(Tooltip, {
      props: {
        children,
        tooltipText: "Save changes",
        placement: "bottom-end",
        keyBindings: ["control", "s"],
      },
    });

    expect(body).toContain('class="tooltip tooltip-bottom');
    expect(body).toContain("tooltip-end");
    expect(body).toContain('data-tooltip-side="bottom"');
    expect(body).toContain('data-tooltip-alignment="end"');
    expect(body).toContain('class="tooltip-content');
    expect(body).toContain("Save changes");
    expect(body).toContain("Ctrl");
    expect(body).toContain("bg-warning");
    expect(body).toContain("text-warning-content");
    expect(body).toContain("font-bold");
    expect(body).toContain('<button type="button">Save</button>');
    expect(body.indexOf('class="tooltip-content')).toBeLessThan(body.indexOf("<button"));
  });

  it.each([
    ["top-start", "tooltip-top", "tooltip-start"],
    ["right-center", "tooltip-right", "tooltip-center"],
    ["bottom-end", "tooltip-bottom", "tooltip-end"],
    ["left", "tooltip-left", "tooltip-center"],
  ] as const)("maps %s to DaisyUI direction and alignment modifiers", (placement, side, align) => {
    const children = createRawSnippet(() => ({ render: () => "Target" }));
    const { body } = render(Tooltip, {
      props: { children, tooltipText: "Help", placement },
    });

    expect(body).toContain(side);
    expect(body).toContain(align);
  });

  it("renders rich content separately from its interactive target", () => {
    const content = createRawSnippet(() => ({ render: () => "<strong>Formula</strong>" }));
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Average</button>',
    }));

    const { body } = render(Tooltip, { props: { children, content } });

    expect(body).toContain("<strong>Formula</strong>");
    expect(body).toContain('<button type="button">Average</button>');
    expect(body.indexOf("<strong>")).toBeLessThan(body.indexOf("<button"));
  });
});
