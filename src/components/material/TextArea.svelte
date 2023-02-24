<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = '';
  export let cClass = '';
  export let placeholder = '';
  let cl = '';
  export { cl as class };

  let innerText = '<br>';
  let dispatch = createEventDispatcher();

  function keyup(e: KeyboardEvent) {
    dispatch('keyup', e);
  }

  function keydown(e: KeyboardEvent) {
    dispatch('keydown', e);
  }

  $: innerText = value.replace(/\n/g, '<br>') + '<br>';
</script>

<div class="relative {cClass || ""}">
  <div
    class="lesp bg-transparent text-transparent outline-none p-2 border-4 border-transparent"
    bind:innerHTML={ innerText } contenteditable="false"></div>
  <textarea
    on:keyup={ keyup } on:keydown={ keydown }
    { placeholder }
    bind:value class="{ cl || "bg-gray-600 text-gray-300" } text-gray-400 flex m-auto p-2 rounded-md
  border border-solid border-gray-400 focus:text-gray-300 outline-none
  transition-all duration-200 absolute inset-0 w-full h-full resize-none"></textarea>
</div>

<style>
  .lesp {
    letter-spacing: 1.1px;
  }
</style>