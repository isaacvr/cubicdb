<script lang="ts">
  import { Tooltip } from "flowbite-svelte";
  import { type Keycode } from "$lib/constants/keys";
  import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-svelte";

  interface TooltipProps {
    children?: any;
    keyBindings?: Keycode[];
  }

  type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

  const ICONMAP: PartialRecord<Keycode, any> = {
    control: "Ctrl",
    shift: "Shift",
    comma: ",",
    up: ChevronUp,
    right: ChevronRight,
    left: ChevronLeft,
    updown: ChevronsUpDown,
  };

  let { children, keyBindings }: TooltipProps = $props();
</script>

<Tooltip class="bg-neutral select-none w-max max-w-sm">
  <div class="flex gap-2 items-center">
    {@render children?.()}
    {#if keyBindings}
      <div class="flex items-center gap-1">
        {#each keyBindings as k, p}
          {#if p > 0}+{/if}
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
