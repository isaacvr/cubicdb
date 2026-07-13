<script lang="ts">
  import type { Snippet } from "svelte";

  type PopoverPlacement = "top" | "bottom" | "left" | "right";

  interface PopoverProps {
    id: string;
    children: Snippet;
    content: Snippet;
    placement?: PopoverPlacement;
    class?: string;
    triggerClass?: string;
    ariaLabel?: string;
  }

  let {
    id,
    children,
    content,
    placement = "top",
    class: customClass = "",
    triggerClass = "",
    ariaLabel,
  }: PopoverProps = $props();

  const placementMap: Record<PopoverPlacement, string> = {
    top: "dropdown-top",
    bottom: "dropdown-bottom",
    left: "dropdown-left",
    right: "dropdown-right",
  };

  let anchorName = $derived(`--${id}`);
</script>

<button
  type="button"
  class={triggerClass}
  popovertarget={id}
  aria-label={ariaLabel}
  style:anchor-name={anchorName}
>
  {@render children()}
</button>

<div
  {id}
  popover="auto"
  class="dropdown {placementMap[placement]} rounded-box border border-base-content/15 bg-base-200
    text-base-content shadow-xl z-50 p-3 {customClass}"
  style:position-anchor={anchorName}
>
  {@render content()}
</div>
