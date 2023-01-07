<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = '';
  export let placeholder = '';
  let cl = '';
  export { cl as class };

  let innerText = '<br>';
  let dispatch = createEventDispatcher();

  function keyup(e) {
    dispatch('keyup', e);
  }

  function keydown(e) {
    dispatch('keydown', e);
  }

  $: innerText = value.replace(/\n/g, '<br>') + '<br>';
</script>

<div class="relative">
  <div
    class="lesp bg-transparent text-transparent outline-none p-2 border-4 border-transparent"
    bind:innerHTML={ innerText } contenteditable="false"></div>
  <textarea
    on:keyup={ keyup } on:keydown={ keydown }
    { placeholder }
    bind:value class="bg-white bg-opacity-10 text-gray-400 flex m-auto p-2 rounded-md
  border-4 border-solid border-transparent focus:text-gray-300 outline-none
  transition-all duration-200 absolute inset-0 w-full h-full resize-none { cl || '' }"></textarea>
</div>

<style>
  .lesp {
    letter-spacing: 1.1px;
  }
</style>