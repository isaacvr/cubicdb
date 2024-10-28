<script lang="ts">
  import { onMount } from "svelte";

  export let show = false;
  export let cancel = true;
  export let onClose: Function = () => {};
  export let closeOnClickOutside = true;
  export let closeOnEscape = true;
  export let transitionName = "none";

  let _cl = "";
  export { _cl as class };

  let modal: HTMLDialogElement;

  function keyUpHandler(e: KeyboardEvent) {
    if (!show) return;
    e.stopPropagation();
  }

  function keyDownHandler(e: KeyboardEvent) {
    if (!show) return;
    e.stopPropagation();

    if (e.code === "Escape") {
      if (closeOnEscape && e.target === modal) {
        close(null);
      } else {
        e.preventDefault();
      }
    }
  }

  function handleShow(s: boolean) {
    if (!modal) return;

    s && modal.showModal();
    !s && modal.close();
  }

  function handleClick(ev: MouseEvent) {
    if (!cancel) return;

    if (ev.target != modal) return;

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
    onClose.call(null, data || null);
    show = false;
    return show;
  }

  onMount(() => {
    handleShow(show);

    modal.addEventListener("cancel", e => {
      if (!cancel) {
        e.preventDefault();
        return;
      }

      close(null);
    });
  });

  $: handleShow(show);
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  data-type="modal"
  bind:this={modal}
  on:mousedown={handleClick}
  on:keyup={keyUpHandler}
  on:keydown={keyDownHandler}
  class="bg-backgroundLevel2 rounded-md show p-4 pt-3 overflow-visible {_cl || ''}"
  style="view-transition-name: {transitionName};"
>
  {#if show}
    <slot />
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
