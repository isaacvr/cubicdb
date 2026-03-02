<script lang="ts">
  import { type Snippet } from "svelte";

  interface TabsProps {
    vertical?: boolean;
    class?: string;
    children?: Snippet;
  }

  let { vertical = false, class: customClass = "", children }: TabsProps = $props();
</script>

<div class="tabs {vertical ? 'tabs-vertical' : 'tabs-bordered'} {customClass}">
  {#if children}
    {@render children()}
  {/if}
</div>
