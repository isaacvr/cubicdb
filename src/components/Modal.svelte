<script lang="ts">
  import { onMount } from "svelte";

  export let show = false;
  export let cancel = true;
  export let onClose: Function = () => {};
  export let closeOnClickOutside = true;
  
  let _cl = '';
  export {_cl as class};

  let modal: HTMLDialogElement;
  
  function keyUpHandler(e: KeyboardEvent) {
    if ( !show ) return;
    e.stopPropagation();
  }

  function keyDownHandler(e: KeyboardEvent) {
    if ( !show ) return;
    e.stopPropagation();
  }

  function handleShow(s: boolean) {
    if ( !modal ) return;

    s && modal.showModal();
    !s && modal.close();
  }

  function handleClick(ev: MouseEvent) {
    if ( !cancel ) return;

    let bb = modal.getBoundingClientRect();
    let x1 = bb.x, y1 = bb.y;
    let x2 = x1 + bb.width, y2 = y1 + bb.height;
    let cx = ev.x, cy = ev.y;

    if ( closeOnClickOutside && ((cx - x1) * (cx - x2) > 0 || (cy - y1) * (cy - y2) > 0) ) {
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

    modal.addEventListener('cancel', (e) => {
      if ( !cancel ) {
        e.preventDefault();
      }
    });
  });

  $: handleShow(show);

</script>

<dialog bind:this={ modal } on:click={ handleClick } on:keyup={ keyUpHandler } on:keydown={ keyDownHandler }
  class="bg-gray-800 rounded-md show p-4 pt-3 overflow-visible { _cl || '' }">
  {#if show}
    <slot />
  {/if}
</dialog>

<style lang="postcss">
  dialog::backdrop {
    background-color: #0008;
    z-index: -1;
  }

  .show {
    animation: enter 400ms ease-in 1;
  }
</style>