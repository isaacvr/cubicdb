<script lang="ts">
  import { Tooltip } from "flowbite-svelte";
  import { type Keycode } from "$lib/constants/keys";
  import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsUpDownIcon,
    ChevronUpIcon,
  } from "lucide-svelte";
  import type { Placement } from "@interfaces";
  import { twMerge } from "tailwind-merge";

  interface TooltipProps {
    children?: any;
    keyBindings?: Keycode[];
    placement?: Placement;
    class?: string;
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
    placement = undefined,
    class: _cl = $bindable(""),
  }: TooltipProps = $props();
</script>

<Tooltip class={twMerge("bg-neutral select-none w-max max-w-sm", _cl)} bind:placement>
  <div class="flex gap-2 items-center">
    {@render children?.()}
    {#if keyBindings}
      <div class="flex items-center gap-1">
        {#each keyBindings as k, p}
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
</Tooltip>
