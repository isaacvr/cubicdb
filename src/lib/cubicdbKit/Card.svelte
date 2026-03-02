<script lang="ts">
  import { type Snippet } from "svelte";

  interface CardProps {
    class?: string;
    title?: string;
    children?: Snippet;
  }

  let { class: customClass = "", title, children }: CardProps = $props();
</script>

<div class="card bg-base-100 shadow-md rounded-lg border border-base-300 {customClass}">
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
</div>
