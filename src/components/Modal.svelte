<script lang="ts">
  export let show = false;
  export let cancel = true;
  export let onClose: Function = () => {};
  
  let _cl = '';
  export {_cl as class};
  
  function keyUpHandler(e: KeyboardEvent) {
    if ( !show ) return;

    if ( e.key === 'Escape' && cancel ) {
      e.stopPropagation();
      close(null);
    }
  }

  function keyDownHandler(e: KeyboardEvent) {
    if ( !show ) return;
    e.stopPropagation();
  }

  export function close(data: any) {
    onClose.call(null, data || null);
    show = false;
    return show;
  }

</script>

<svelte:window on:keyup={ keyUpHandler } on:keydown={ keyDownHandler }></svelte:window>

{#if show}
  <div id="wrapper"
    on:mousedown|self|stopPropagation={ () => cancel && close(null) }
    class="fixed bg-black bg-opacity-80 top-0 left-0 w-full h-full
      flex items-center justify-center transition-all z-50">
    <div class="bg-gray-800 rounded-md show p-4 pt-3 { _cl || '' }">
      <slot />
    </div>
  </div>
{/if}

<style lang="postcss">
  @keyframes enter {
    0%   { margin-top: -5rem; }
    100% { margin-top: 0; }
  }

  @keyframes fadeIn {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }

  #wrapper {
    animation: fadeIn 200ms ease-in 1;
  }

  .show {
    animation: enter 400ms ease-in 1;
  }
</style>