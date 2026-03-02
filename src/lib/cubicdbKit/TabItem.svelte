<script lang="ts">
  import { type Snippet } from "svelte";

  interface TabItemProps {
    title: string;
    active?: boolean;
    class?: string;
    children?: Snippet;
  }

  let { title, active = false, class: customClass = "", children }: TabItemProps = $props();
</script>

<button class="tab px-4 py-2 border-b-2 border-transparent hover:border-primary transition-colors cursor-pointer {active ? 'border-primary active' : ''} {customClass}">
  {title}
</button>

{#if children}
  {@render children()}
{/if}
