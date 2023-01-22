<script lang="ts">
  import { ripple } from './actions/ripple';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let flat = false;
  export let rp = {};
  export let file = null;
  let cl = "";
  export { cl as class };

  function handleClick(...args) {
    dispatch('click', ...args);

    if ( file ) {
      let f = document.createElement('input');
      f.type = 'file';
      f.style.display = 'none';
      f.addEventListener('change', (e) => {
        dispatch('files', f.files);
        f.remove();
      });
      document.body.appendChild(f);
      f.click();
    }
  }
</script>

<button on:click={handleClick} use:ripple={ rp } class={`
  border px-4 py-2 rounded-md shadow-md flex items-center justify-center border-none
  relative uppercase font-bold text-gray-400 transition-all duration-200

  hover:shadow-lg
` + (flat ? ' shadow-none px-2 py-1 ' : '') + (cl || ' hover:bg-white hover:bg-opacity-10 ')}
>
  <slot />
</button>

<style>
  button {
    outline: none;
  }
</style>