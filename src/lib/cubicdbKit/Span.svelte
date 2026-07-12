<script lang="ts">
  import type { Snippet } from "svelte";

  interface SpanProps {
    class?: string;
    children?: Snippet;
  }

  let { class: customClass = "", children }: SpanProps = $props();
</script>

<span class={customClass}>
  {#if children}
    {@render children()}
  {/if}
</span>
