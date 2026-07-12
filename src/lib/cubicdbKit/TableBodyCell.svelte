<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableBodyCellProps {
    class?: string;
    tdClass?: string;
    children?: Snippet;
  }

  let { class: customClass = "", tdClass = "", children }: TableBodyCellProps = $props();
</script>

<td class="{tdClass} {customClass}">
  {#if children}
    {@render children()}
  {/if}
</td>
