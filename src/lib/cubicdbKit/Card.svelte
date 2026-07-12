<script lang="ts">
  import { type Snippet } from "svelte";

  interface CardProps {
    class?: string;
    style?: string;
    title?: string;
    children?: Snippet;
    footer?: Snippet;
  }

  let { class: customClass = "", style, title, children, footer }: CardProps = $props();
</script>

<div class="card bg-base-100 shadow-md rounded-lg border border-base-300 {customClass}" {style}>
  {#if title}
    <div class="card-body">
      <h2 class="card-title">{title}</h2>
      {#if children}
        {@render children()}
      {/if}
    </div>
  {:else if children}
    {@render children()}
  {/if}
  {#if footer}
    {@render footer()}
  {/if}
</div>
