<script lang="ts">
  import { ripple } from './actions/ripple.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let flat = false;
  export let rp = {};
  let cl = "";
  export { cl as class };

  function handleClick(...args) {
    dispatch('click', ...args);
  }
</script>

<button on:click={handleClick} use:ripple={ rp } class={`
  border px-4 py-2 rounded-md shadow-md flex items-center justify-center border-none
  relative uppercase font-bold text-gray-400 hover:bg-white hover:bg-opacity-10 transition-all duration-200

  hover:shadow-lg
` + (flat ? ' shadow-none px-2 py-1 ' : '') + (cl || '')}
>
  <slot />
</button>

<style>
  button {
    outline: none;
  }
</style>