<script lang="ts">
  import type { Snippet } from "svelte";

  interface TableProps {
    class?: string;
    divClass?: string;
    shadow?: boolean;
    hoverable?: boolean;
    striped?: boolean;
    children?: Snippet;
  }

  let {
    class: customClass = "",
    divClass = "",
    shadow = false,
    hoverable = false,
    striped = false,
    children,
  }: TableProps = $props();
</script>

<div class={divClass || "overflow-x-auto"}>
  <table class="table w-full {shadow ? 'shadow-md' : ''} {hoverable ? 'table-pin-rows' : ''} {striped ? 'table-zebra' : ''} {customClass}">
    {#if children}
      {@render children()}
    {/if}
  </table>
</div>
