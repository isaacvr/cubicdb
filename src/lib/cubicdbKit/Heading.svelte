<script lang="ts">
  import { type Snippet } from "svelte";

  interface HeadingProps {
    tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    class?: string;
    children?: Snippet;
  }

  let { tag = "h2", class: customClass = "", children }: HeadingProps = $props();

  const sizeMap = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-bold",
    h3: "text-2xl font-bold",
    h4: "text-xl font-bold",
    h5: "text-lg font-bold",
    h6: "text-base font-bold",
  };
</script>

<svelte:element this={tag} class="{sizeMap[tag]} {customClass}">
  {#if children}
    {@render children()}
  {/if}
</svelte:element>
