<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { XIcon } from "lucide-svelte";
  import { fly } from "svelte/transition";

  interface ModalProps {
    show?: boolean;
    cancel?: boolean;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    transitionName?: string;
    class?: string;
    onclose?: (...data: any[]) => any;
    children?: () => any;
  }

  let {
    show = $bindable(false),
    cancel = $bindable(true),
    closeOnClickOutside = $bindable(true),
    closeOnEscape = $bindable(true),
    class: _cl = $bindable(""),
    transitionName = $bindable("none"),
    onclose = () => {},
    children = () => {},
  }: ModalProps = $props();

  let modal: HTMLDialogElement;

  function keyUpHandler(e: KeyboardEvent) {
    if (!show) return;
    e.stopPropagation();
  }

  function keyDownHandler(e: KeyboardEvent) {
    if (!show) return;
    e.stopPropagation();

    if (e.code === "Escape") {
      if (closeOnEscape && e.target === e.currentTarget) {
        close(null);
      } else {
        e.preventDefault();
      }
    }
  }

  function handleClick(ev: MouseEvent) {
    if (!cancel) return;
    if (!modal) return;
    if (ev.target != ev.currentTarget) return;

    let bb = modal.getBoundingClientRect();
    let x1 = bb.x,
      y1 = bb.y;
    let x2 = x1 + bb.width,
      y2 = y1 + bb.height;
    let cx = ev.x,
      cy = ev.y;

    if (closeOnClickOutside && ((cx - x1) * (cx - x2) > 0 || (cy - y1) * (cy - y2) > 0)) {
      close(null);
    }
  }

  export function close(data: any) {
    onclose && onclose(data || null);
    show = false;
    return show;
  }

  $effect(() => {
    if (show) {
      modal?.showModal();
    } else {
      modal?.close();
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={modal}
  data-type="modal"
  role="alert"
  onmousedown={handleClick}
  onkeyup={keyUpHandler}
  onkeydown={keyDownHandler}
  oncancel={e => !cancel && e.preventDefault()}
  class="bg-base-200 text-sm rounded-md show p-4 pt-3 overflow-visible {_cl || ''}"
  style="view-transition-name: {transitionName};"
>
  {#if cancel}
    <Button color="none" class="rounded-lg p-0 float-right hover:border-primary" onclick={close}>
      <XIcon size="1rem" />
    </Button>
  {/if}

  {#if show}
    {@render children?.()}
  {/if}
</dialog>

<style lang="postcss">
  @keyframes fadeIn {
    from {
      background-color: #0000;
      backdrop-filter: blur(0);
    }

    to {
      background-color: #0003;
      backdrop-filter: blur(0.5rem);
    }
  }

  dialog::backdrop {
    z-index: -1;
    animation: fadeIn 200ms linear 0ms forwards;
    background-color: #0003;
    backdrop-filter: blur(0.5rem);
  }

  .show {
    animation: enter 400ms ease-in 1;
  }
</style>
