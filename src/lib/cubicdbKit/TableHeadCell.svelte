<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableHeadCellProps {
    class?: string;
    padding?: string;
    children?: Snippet;
  }

  let { class: customClass = "", padding = "px-4 py-3", children }: TableHeadCellProps = $props();
</script>

<th class="{padding} {customClass}">
  {#if children}
    {@render children()}
  {/if}
</th>
