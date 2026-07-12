<script lang="ts">
  import { type Snippet } from "svelte";
  import { type Keycode } from "$lib/constants/keys";
  import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsUpDownIcon,
    ChevronUpIcon,
  } from "lucide-svelte";
  import type { Placement } from "@interfaces";

  interface TooltipProps {
    children?: Snippet;
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
    keyBindings,
    placement = "top",
    class: _cl = "",
    tooltipText = "",
  }: TooltipProps = $props();

  const placementMap: Record<string, string> = {
    top: "tooltip-top",
    bottom: "tooltip-bottom",
    left: "tooltip-left",
    right: "tooltip-right",
  };
</script>

<div class="tooltip {placementMap[placement] || 'tooltip-top'} {_cl}" data-tip={tooltipText || ""}>
  <div class="flex gap-2 items-center">
    {#if children}
      {@render children()}
    {/if}
    {#if keyBindings}
      <div class="flex items-center gap-1">
        {#each keyBindings as k, p (p)}
          {#if p > 0}
            <div class="pb-1">+</div>
          {/if}
          <kbd class="kbd kbd-sm text-xs">
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
</div>
