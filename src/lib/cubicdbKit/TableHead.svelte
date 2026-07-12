<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableHeadProps {
    class?: string;
    theadClass?: string;
    children?: Snippet;
  }

  let { class: customClass = "", theadClass = "", children }: TableHeadProps = $props();
</script>

<thead class="{theadClass} {customClass}">
  <tr>
    {#if children}
      {@render children()}
    {/if}
  </tr>
</thead>
