<script lang="ts">
  import { type Snippet } from "svelte";
  import { type Keycode } from "$lib/constants/keys";
  import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsUpDownIcon,
    ChevronUpIcon,
  } from "lucide-svelte";
  import type { Alignment, Placement, Side } from "@interfaces";

  interface TooltipProps {
    children?: Snippet;
    content?: Snippet;
    keyBindings?: Keycode[];
    placement?: Placement;
    class?: string;
    tooltipText?: string;
  }

  type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

  const ICONMAP: PartialRecord<Keycode, any> = {
    control: "Ctrl",
    shift: "Shift",
    comma: ",",
    up: ChevronUpIcon,
    right: ChevronRightIcon,
    left: ChevronLeftIcon,
    updown: ChevronsUpDownIcon,
  };

  let {
    children,
    content,
    keyBindings,
    placement = "top",
    class: _cl = "",
    tooltipText = "",
  }: TooltipProps = $props();

  const sideClassMap: Record<Side, string> = {
    top: "tooltip-top",
    bottom: "tooltip-bottom",
    left: "tooltip-left",
    right: "tooltip-right",
  };

  const alignmentClassMap: Record<Alignment, string> = {
    start: "tooltip-start",
    center: "tooltip-center",
    end: "tooltip-end",
  };

  let placementParts = $derived.by(() => {
    const [side, alignment = "center"] = placement.split("-") as [Side, Alignment?];

    return {
      side,
      alignment,
      classes: `${sideClassMap[side]} ${alignmentClassMap[alignment]}`,
    };
  });
</script>

<div
  class="tooltip {placementParts.classes} {_cl}"
  data-tooltip-side={placementParts.side}
  data-tooltip-alignment={placementParts.alignment}
>
  {#if content || tooltipText || keyBindings}
    <div class="tooltip-content border border-base-content/15 shadow-lg">
      {#if content}
        {@render content()}
      {:else}
        <div class="flex gap-2 items-center">
          {#if tooltipText}
            <span>{tooltipText}</span>
          {/if}
          {#if keyBindings}
            <div class="flex items-center gap-1">
              {#each keyBindings as k, p (p)}
                {#if p > 0}
                  <div class="pb-1">+</div>
                {/if}
                <kbd
                  class="kbd kbd-sm border-warning bg-warning text-xs font-bold text-warning-content shadow-sm"
                >
                  {#if !ICONMAP[k] || typeof ICONMAP[k] === "string"}
                    {@const key = ICONMAP[k] || k || ""}
                    {key.slice(0, 1).toUpperCase() + key.slice(1)}
                  {:else}
                    {@const Icon = ICONMAP[k]}
                    <Icon size="0.8rem" />
                  {/if}
                </kbd>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  /* DaisyUI 5.6 alignment modifiers, retained locally while the project uses 5.5.x. */
  .tooltip-top > .tooltip-content,
  .tooltip-bottom > .tooltip-content {
    transform: translateX(var(--tt-translate, -50%)) translateY(var(--tt-pos, 0.25rem));
  }

  .tooltip-bottom > .tooltip-content {
    --tt-pos: -0.25rem;
  }

  .tooltip-top::after,
  .tooltip-bottom::after {
    transform: translateX(var(--tt-translate, -50%)) translateY(var(--tt-pos, 0.25rem));
  }

  .tooltip-bottom::after {
    --tt-pos: -0.25rem;
    rotate: 180deg;
  }

  .tooltip-left > .tooltip-content {
    transform: translateX(calc(var(--tt-pos, 0.25rem) - 0.25rem))
      translateY(var(--tt-translate, -50%));
  }

  .tooltip-right > .tooltip-content {
    transform: translateX(calc(var(--tt-pos, -0.25rem) + 0.25rem))
      translateY(var(--tt-translate, -50%));
  }

  .tooltip-left::after {
    transform: translateX(var(--tt-pos, 0.25rem)) translateY(var(--tt-translate, -50%))
      rotate(-90deg);
  }

  .tooltip-right::after {
    transform: translateX(var(--tt-pos, -0.25rem)) translateY(var(--tt-translate, -50%))
      rotate(90deg);
  }

  .tooltip-start,
  .tooltip-end {
    --tt-translate: 0;
  }

  .tooltip-start > .tooltip-content {
    right: auto;
  }

  .tooltip-end > .tooltip-content {
    left: auto;
  }

  .tooltip-top.tooltip-start > .tooltip-content,
  .tooltip-bottom.tooltip-start > .tooltip-content {
    left: 0;
  }

  .tooltip-top.tooltip-end > .tooltip-content,
  .tooltip-bottom.tooltip-end > .tooltip-content {
    right: 0;
  }

  .tooltip-top.tooltip-start::after,
  .tooltip-bottom.tooltip-start::after {
    left: 0.5rem;
  }

  .tooltip-top.tooltip-end::after,
  .tooltip-bottom.tooltip-end::after {
    right: 0.5rem;
    left: auto;
  }

  .tooltip-left.tooltip-start > .tooltip-content,
  .tooltip-right.tooltip-start > .tooltip-content {
    top: 0;
    bottom: auto;
  }

  .tooltip-left.tooltip-end > .tooltip-content,
  .tooltip-right.tooltip-end > .tooltip-content {
    top: auto;
    bottom: 0;
  }

  .tooltip-left.tooltip-start::after,
  .tooltip-right.tooltip-start::after {
    top: 0.5rem;
  }

  .tooltip-left.tooltip-end::after,
  .tooltip-right.tooltip-end::after {
    top: auto;
    bottom: 0.5rem;
  }
</style>
