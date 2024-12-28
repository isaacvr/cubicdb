<script lang="ts">
  import { Tooltip } from "flowbite-svelte";

  interface TooltipProps {
    children?: any;
    keyBindings?: string[];
  }

  let { children, keyBindings }: TooltipProps = $props();
</script>

<Tooltip class="bg-neutral select-none w-max max-w-sm">
  <div class="flex gap-2 items-center">
    {@render children?.()}
    {#if keyBindings}
      <div class="flex items-center gap-1">
        {#each keyBindings as k, p}
          {#if p > 0}+{/if}
          <kbd class="kbd kbd-sm text-xs">{k}</kbd>
        {/each}
      </div>
    {/if}
  </div>
</Tooltip>
