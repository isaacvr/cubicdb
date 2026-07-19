<script lang="ts">
  import type { Snippet } from "svelte";
  import { twMerge } from "tailwind-merge";

  interface PanelProps {
    title?: string;
    class?: string;
    contentClass?: string;
    children?: Snippet;
    actions?: Snippet;
  }

  let {
    title,
    class: customClass = "",
    contentClass = "",
    children,
    actions,
  }: PanelProps = $props();
</script>

<section class={twMerge("cdb-panel flex flex-col gap-1 overflow-hidden p-1", customClass)}>
  {#if title || actions}
    <header class="cdb-panel-header">
      {#if title}
        <h2 class="cdb-panel-title">{title}</h2>
      {:else}
        <span class="cdb-panel-title" aria-hidden="true"></span>
      {/if}

      {#if actions}
        <div class="flex shrink-0 items-center gap-2">
          {@render actions()}
        </div>
      {/if}
    </header>
  {/if}

  {#if children}
    <div class={twMerge("min-h-0 flex-1", contentClass)}>
      {@render children()}
    </div>
  {/if}
</section>
