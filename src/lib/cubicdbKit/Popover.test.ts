import { createRawSnippet } from "svelte";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import Popover from "./Popover.svelte";

describe("Popover", () => {
  it("links a DaisyUI popover to its trigger and renders it in the top layer", () => {
    const children = createRawSnippet(() => ({ render: () => "Average" }));
    const content = createRawSnippet(() => ({ render: () => "<strong>Formula</strong>" }));

    const { body } = render(Popover, {
      props: { id: "average-help", children, content, placement: "left" },
    });

    expect(body).toContain('popovertarget="average-help"');
    expect(body).toContain('id="average-help"');
    expect(body).toContain('popover="auto"');
    expect(body).toContain("dropdown-left");
    expect(body).toContain("bg-base-200");
    expect(body).toContain("<strong>Formula</strong>");
  });
});
