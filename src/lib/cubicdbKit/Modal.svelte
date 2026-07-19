<script lang="ts">
  import { createEventDispatcher, type Snippet } from "svelte";
  import Button from "./Button.svelte";

  interface ModalProps {
    open?: boolean;
    show?: boolean;
    class?: string;
    children?: Snippet;
    title?: string;
    autoclose?: boolean;
    outsideclose?: boolean;
  }

  const dispatch = createEventDispatcher();

  let {
    open = $bindable(false),
    show = $bindable(undefined),
    class: customClass = "",
    children,
    title,
    autoclose = true,
    outsideclose = false,
  }: ModalProps = $props();

  function isVisible() {
    return typeof show === "boolean" ? show : open;
  }

  function close() {
    open = false;
    if (typeof show === "boolean") {
      show = false;
    }
    dispatch("close");
  }

  function handleBackdropClick(event: MouseEvent) {
    if (!outsideclose) return;
    if (event.target === event.currentTarget) {
      close();
    }
  }
</script>

{#if isVisible()}
  <div class="modal modal-open {customClass}" onclick={handleBackdropClick} onkeydown={() => {}}>
    <div class="modal-box max-w-2xl">
      {#if title}
        <h3 class="mb-4 text-lg font-bold">{title}</h3>
      {/if}
      {#if children}
        {@render children()}
      {/if}
      {#if autoclose}
        <div class="modal-action">
          <Button type="secondary" onclick={close}>Close</Button>
        </div>
      {/if}
    </div>
  </div>
{/if}
