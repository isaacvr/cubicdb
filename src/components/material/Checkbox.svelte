<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let checked = false;
  export let undef = false;
  let _class = '';
  export { _class as class };
  
  const dispatch = createEventDispatcher();

  function toggle() {
    checked = !checked;
    checked && dispatch('checked');
    !checked && dispatch('unchecked');
    dispatch('change', { value: checked });
  }
</script>

<div class={"wrapper " + _class}>
  <div class:checked class:undef class="box" on:click={ toggle }>
    <div class="mark"></div>
  </div>
</div>

<style lang="postcss">
  .box {
    @apply flex items-center justify-center h-4 w-4
    shadow-sm border-2 border-blue-400 rounded-sm
    hover:cursor-pointer transition-all duration-100
    hover:border-blue-500;
  }

  .box.checked {
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