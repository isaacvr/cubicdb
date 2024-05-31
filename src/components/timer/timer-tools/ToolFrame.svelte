<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ActiveTool } from "@interfaces";
  import CloseIcon from "@icons/Close.svelte";
  import ContractIcon from "@icons/ChevronLeft.svelte";
  import { Button } from "flowbite-svelte";

  export let tool: ActiveTool;

  const dispatch = createEventDispatcher();

  function toggle() {
    tool.open = !tool.open;
  }

  function closeTool() {
    dispatch("close");
  }
</script>

<li class="tool" class:open={tool.open}>
  <header class="header">
    <button on:click={toggle}>
      <svelte:component this={tool.tool.icon} {...tool.tool.iconParams} size="1.2rem" />
    </button>
    <span class="title mr-8 cursor-default select-none">{tool.tool.text}</span>
    
    {#if tool.open}
      <Button size="xs" color="none" class="p-1 ml-auto" on:click={toggle}>
        <ContractIcon size="1.2rem" />
      </Button>

      <Button size="xs" color="none" class="p-1" on:click={closeTool}>
        <CloseIcon size="1.2rem" />
      </Button>
    {/if}
  </header>

  <div class="content">
    <slot />
  </div>
</li>

<style lang="postcss">
  .tool {
    @apply bg-gray-700 p-2 rounded-md grid;
  }

  .tool .header {
    @apply flex gap-2 w-full border-b border-b-gray-600 mb-2;
  }

  .tool:not(.open) {
    @apply w-min;
  }

  .tool:not(.open) .title,
  .tool:not(.open) .content {
    @apply hidden;
  }

  .tool:not(.open) .header {
    @apply border-none mb-0;
  }
</style>
