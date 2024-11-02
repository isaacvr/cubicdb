<script lang="ts">
  import { createEventDispatcher, setContext } from "svelte";
  import { Button } from "flowbite-svelte";
  import type { ActiveTool } from "@interfaces";
  import CloseIcon from "@icons/Close.svelte";
  import ContractIcon from "@icons/ChevronLeft.svelte";
  import SettingsIcon from "@icons/Cog.svelte";
  import { writable } from "svelte/store";

  export let tool: ActiveTool;

  const dispatch = createEventDispatcher();

  let open = tool.open;
  let configMode = writable(false);

  setContext("configMode", configMode);

  function toggle() {
    open = !open;
    open && dispatch("expand");
    !open && dispatch("collapse");
  }

  function closeTool() {
    dispatch("close");
  }

  function toggleConfig() {
    $configMode = !$configMode;
  }
</script>

<li class="tool" class:open>
  <header class="header">
    <button on:click={toggle}>
      <svelte:component this={tool.tool.icon} {...tool.tool.iconParams} size="1.2rem" />
    </button>
    <span class="title mr-8 cursor-default select-none">{tool.tool.text}</span>

    {#if open}
      <div class="ml-auto">
        {#if tool.tool.hasSettings}
          <Button size="xs" color="none" class="p-1" on:click={toggleConfig}>
            <SettingsIcon size="1rem" />
          </Button>
        {/if}

        <Button size="xs" color="none" class="p-1" on:click={toggle}>
          <ContractIcon size="1.2rem" />
        </Button>

        <Button size="xs" color="none" class="p-1" on:click={closeTool}>
          <CloseIcon size="1.2rem" />
        </Button>
      </div>
    {/if}
  </header>

  <div class="content">
    <slot />
  </div>
</li>

<style lang="postcss">
  .tool {
    @apply bg-gray-700 rounded-md grid overflow-auto w-fit shadow-sm border border-gray-600;
    max-height: min(30rem, 90vh);
  }

  .tool .header {
    @apply flex gap-2 w-full border-b border-b-gray-600 mb-2 sticky top-0 left-0 p-2
      bg-gray-700;
  }

  .tool.open {
    grid-column: 1 / -1;
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

  .tool .content {
    @apply p-2 pt-0;
  }
</style>
