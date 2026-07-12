<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableBodyProps {
    class?: string;
    children?: Snippet;
  }

  let { class: customClass = "", children }: TableBodyProps = $props();
</script>

<tbody class={customClass}>
  {#if children}
    {@render children()}
  {/if}
</tbody>
