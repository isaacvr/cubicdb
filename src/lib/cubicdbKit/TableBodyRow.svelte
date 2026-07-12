<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableBodyRowProps {
    class?: string;
    children?: Snippet;
  }

  let { class: customClass = "", children }: TableBodyRowProps = $props();
</script>

<tr class={customClass}>
  {#if children}
    {@render children()}
  {/if}
</tr>
