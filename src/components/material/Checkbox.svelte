<script lang="ts">
    import { processKey } from "@helpers/strings";
  import { createEventDispatcher, onMount } from "svelte";

  export let checked: boolean = false;
  export let undef = false;
  export let label = '';
  export let disabled = false;
  export let tabindex = 0;
  export let hasKeybinding = false;
  let _class = '';
  export { _class as class };
  
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

  onMount(() => {
    dispatch('change', { value: checked });
  });

</script>

<div class="wrapper flex items-center" class:disabled={ disabled }
  aria-disabled={ disabled } aria-label={ label } aria-checked={ checked }>
  <button class:checked class:undef class="box { _class }"
    on:click={ toggle } on:keydown={ handleKeydown } tabindex={ disabled ? -1 : tabindex }>
    <div class="mark"></div>
  </button>
  {#if label}
    <button class="label ml-1 cursor-pointer flex" on:click={ toggle } on:keydown={ handleKeydown }>
      { hasKeybinding ? processKey(label)[0] : label }

      {#if hasKeybinding}
        &nbsp; <span class="flex ml-auto text-yellow-400">{ processKey(label)[1] }</span>
      {/if}
    </button>
  {/if}
</div>

<style lang="postcss">
  .box {
    @apply flex items-center justify-center w-5 h-5
    shadow-sm border-2 border-blue-400 rounded-sm
    hover:cursor-pointer transition-all duration-100;
  }

  .wrapper.disabled .box {
    @apply border-gray-400 pointer-events-none;
  }
  
  .wrapper:not(.disabled) .box {
    @apply hover:border-blue-500;
  }

  .wrapper:not(.disabled) .box.checked {
    @apply bg-blue-400 hover:bg-blue-500;
  }

  .mark {
    @apply transition-all duration-100 ease-linear;
    width: .4rem;
    height: .7rem;
    border: .15rem solid white;
    border-top: 0;
    border-left: 0;
    transform: translateY(-.1rem) rotate(0deg) scale(0);
  }

  .box.checked .mark {
    transform: translateY(-.1rem) rotate(45deg) scale(1);
  }

  .box.undef .mark {
    border-right: none;
    height: 0;
    transform: scale(1);
  }
</style>