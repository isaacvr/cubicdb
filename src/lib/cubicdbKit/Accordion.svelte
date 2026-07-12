<script lang="ts">
  import type { Snippet } from "svelte";

  interface AccordionProps {
    class?: string;
    children?: Snippet;
  }

  let { class: customClass = "", children }: AccordionProps = $props();
</script>

<div class={customClass}>
  {#if children}
    {@render children()}
  {/if}
</div>
