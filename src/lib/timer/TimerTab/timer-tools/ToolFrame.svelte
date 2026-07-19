<script lang="ts">
  import { setContext } from "svelte";
  import type { ActiveTool } from "@interfaces";
  import { writable } from "svelte/store";
  import Button from "$lib/cubicdbKit/Button.svelte";

  interface ToolFrameProps {
    tool: ActiveTool;
    onexpand?: () => any;
    oncollapse?: () => any;
    onclose?: () => any;
  }

  let { tool, onexpand, oncollapse, onclose }: ToolFrameProps = $props();

  let open = tool.open;
  let configMode = writable(false);

  setContext("configMode", configMode);

  function toggle() {
    open = !open;
    open && onexpand?.();
    !open && oncollapse?.();
  }

  function closeTool() {
    onclose?.();
  }

  function toggleConfig() {
    $configMode = !$configMode;
  }
</script>

<!-- <li class="tool" class:open>
  <header class="header"> -->
{#if tool.tool.icon}
  {@const Icon = tool.tool.icon}
  <Button onclick={toggle} type="secondary" size="sm" icon>
    <Icon {...tool.tool.iconParams} size="1.2rem" />
  </Button>
{/if}

<!-- <span class="title mr-8 cursor-default select-none">{tool.tool.text}</span>

    {#if open}
      <div class="ml-auto">
        {#if tool.tool.hasSettings}
          <Button type="tertiary" size="xs" icon onclick={toggleConfig}>
            <SettingsIcon size="1rem" />
          </Button>
        {/if}

        <Button type="tertiary" size="xs" icon onclick={toggle}>
          <ChevronLeftIcon size="1.2rem" />
        </Button>

        <Button type="tertiary" size="xs" icon onclick={closeTool}>
          <XIcon size="1.2rem" />
        </Button>
      </div>
    {/if}
  </header>

  <div class="content">
    <slot />
  </div>
</li> -->

<style lang="postcss">
  @reference "@src/themes/index.css";

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
