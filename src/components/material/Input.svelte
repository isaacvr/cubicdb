<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  export let placeholder = '';
  export let value: Date | string | number = '';
  export let type = "text";
  export let size = undefined;
  export let disabled = false;
  export let focus = false;
  export let min = null;
  export let max = null;
  export let step = 1;
  
  let cl = '';
  export {cl as class};
  
  let ref: HTMLInputElement;

  $: type = ['text', 'number', 'date'].indexOf(type) === -1 ? 'text' : type;
  // $: focus ? (ref && ref.focus()) : null;
  
  function keyup(e: KeyboardEvent) { dispatch("keyup", e); }
  function keydown(e: KeyboardEvent) { dispatch("keydown", e); }
  function input(e) { dispatch("input", e); }

</script>

<div class="w-full bg-neutral-200 px-2 py-2 rounded-md relative transition-all
  duration-200 border border-solid border-gray-400 wrapper { cl || "" }">
  {#if type === 'text'}
  <input
    autofocus={ focus }
    bind:this={ref} bind:value
    on:keydown={keydown} on:keyup={keyup} on:input={ input }
    {disabled} type="text" { size } placeholder="">
  {/if}
  
  {#if type === 'number'}
  <input {min} {max} {disabled} {step} type="number" on:keydown={keydown} on:keyup={keyup} bind:value placeholder="">
  {/if}

  {#if type === 'date'}
  <input {disabled} type="date" on:keydown={keydown} on:keyup={keyup} bind:value placeholder="">
  {/if}
  <span class="placeholder">{placeholder}</span>
</div>

<style lang="postcss">
  input {
    @apply h-6 flex w-full bg-transparent border-none outline-none;
  }

  input::placeholder {
    opacity: 0;
  }

  .placeholder {
    @apply absolute top-0 my-2 origin-left transition-all duration-200
    text-neutral-500;
  }

  .wrapper:focus-within {
    @apply shadow shadow-blue-200;
  }

  input:focus + .placeholder {
    @apply absolute top-0 -my-5 scale-75 text-black;
  }

  input:not(:placeholder-shown) + .placeholder {
    @apply absolute top-0 -my-5 scale-75;
  }

  .hidden-markers input::-webkit-outer-spin-button,
  .hidden-markers input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>