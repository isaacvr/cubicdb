<script lang="ts">
  import { type Snippet } from "svelte";

  interface DropdownItemProps {
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let { class: customClass = "", onclick, children }: DropdownItemProps = $props();
</script>

<button
  class="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors cursor-pointer block text-sm {customClass}"
  {onclick}
  role="menuitem"
>
  {#if children}
    {@render children()}
  {/if}
</button>
