<script lang="ts">
  import type { Snippet } from "svelte";

  interface BadgeProps {
    color?: string;
    large?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    color = "neutral",
    large = false,
    class: customClass = "",
    children,
  }: BadgeProps = $props();
</script>

<span class="badge badge-{color} {large ? 'badge-lg' : ''} {customClass}">
  {#if children}
    {@render children()}
  {/if}
</span>
