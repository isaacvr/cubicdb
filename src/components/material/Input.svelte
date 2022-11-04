<script lang="ts">
  import { writable } from 'svelte/store';

  export let placeholder = '';
  export let value = '';
  export let type = "text";

  $: type = ['text', 'number', 'date'].indexOf(type) === -1 ? 'text' : type;
</script>

<div class="wrapper">
  {#if type === 'text'}
  <input type="text" bind:value placeholder="">
  {/if}
  
  {#if type === 'number'}
  <input type="number" bind:value placeholder="">
  {/if}

  {#if type === 'date'}
  <input type="date" bind:value placeholder="">
  {/if}
  <span class="placeholder">{placeholder}</span>
</div>

<style lang="postcss">
  .wrapper {
    border: 1px solid;
    @apply w-full bg-neutral-200 px-2 py-2 rounded-sm relative
      transition-all duration-200 border-gray-400;
  }

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
</style>