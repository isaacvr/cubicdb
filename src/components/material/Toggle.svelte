<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let checked = false;
  export let tabindex = 0;

  const dispatch = createEventDispatcher();
  
  function toggle() {
    checked = !checked;
    checked && dispatch('checked');
    !checked && dispatch('unchecked');
    dispatch('change', { value: checked });
  }

  function handleKeydown(ev: KeyboardEvent) {
    if ( ev.code === 'Space' ) {
      toggle();
    }
  }
</script>

<button role="checkbox" class:checked class="wrapper" on:click={ toggle } on:keydown={ handleKeydown }
  { tabindex } aria-disabled={ false } aria-checked={ checked }>
  <div class="mark"></div>
</button>

<style lang="postcss">
  .wrapper {
    @apply flex items-center h-3 w-8
    shadow-sm bg-neutral-400 rounded-full my-2
    hover:cursor-pointer transition-all duration-200
    hover:border-blue-500;
  }

  .wrapper.checked {
    @apply bg-blue-300 hover:bg-blue-400;
  }

  .mark {
    @apply w-4 h-4 bg-white hover:bg-neutral-100 rounded-full shadow
    transition-all duration-100 ease-linear;
  }

  .wrapper.checked .mark {
    @apply ml-4 bg-blue-500 hover:bg-blue-600;
  }
</style>