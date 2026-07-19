<script lang="ts">
  import type { Snippet } from "svelte";

  interface DropdownItemProps {
    class?: string;
    defaultClass?: string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    class: customClass = "",
    defaultClass = "",
    onclick = () => {},
    children,
  }: DropdownItemProps = $props();

  function handleClick(event: MouseEvent) {
    onclick(event);
  }
</script>

<button
  class="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-base-200 {defaultClass} {customClass}"
  onclick={handleClick}
  role="menuitem"
>
  {#if children}
    {@render children()}
  {/if}
</button>
