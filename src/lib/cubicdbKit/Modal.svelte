<script lang="ts">
  import { type Snippet } from "svelte";

  interface ModalProps {
    open?: boolean;
    class?: string;
    children?: Snippet;
    title?: string;
  }

  let { open = $bindable(false), class: customClass = "", children, title }: ModalProps = $props();

  function handleBackdropClick() {
    open = false;
  }
</script>

{#if open}
  <div class="modal modal-open {customClass}">
    <div class="modal-box max-w-md">
      {#if title}
        <h3 class="font-bold text-lg mb-4">{title}</h3>
      {/if}
      {#if children}
        {@render children()}
      {/if}
      <div class="modal-action">
        <button
          class="btn"
          onclick={handleBackdropClick}
        >
          Close
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" onsubmit={handleBackdropClick}>
      <button type="button" />
    </form>
  </div>
{/if}