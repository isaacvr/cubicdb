<script lang="ts">
  import { onDestroy } from "svelte";

  export let show = false;
  export let cancel = true;
  export let onClose: Function = () => {};
  
  function keyUpHandler(e: KeyboardEvent) {
    e.stopPropagation();
    
    if ( e.key === 'Escape' && cancel ) {
      close(null);
    }
  }

  function keyDownHandler(e: KeyboardEvent) {
    e.stopPropagation();
  }

  export function close(data) {
    onClose.call(null, data || null);
    show = false;
    return show;
  }

  const ev: any = [ ['keyup', keyUpHandler], ['keydown', keyDownHandler] ];

  $: ev.map(e => window[(show ? 'add' : 'remove') + 'EventListener'](e[0], e[1], true));

  onDestroy(() => {
    ev.map(e => window.removeEventListener(e[0], e[1], true));
  })

</script>

{#if show}
  <div id="wrapper"
    on:mousedown|self|stopPropagation={ () => cancel && close(null) }
    class="fixed bg-black bg-opacity-80 top-0 left-0 w-full h-full
      flex items-center justify-center transition-all">
    <div class="bg-gray-800 rounded-md show p-2 pt-3">
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