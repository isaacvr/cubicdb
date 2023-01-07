<script lang="ts">
  import ExpandIcon from '@icons/ChevronDown.svelte';

  let cl = '';
  export { cl as class };
  export let placeholder: any = 'Select';
  export let value: any = placeholder;
  export let items: any[];
  export let onChange = (item?: any, pos?: number) => {};
  export let label = (item?: any) => (item || "");
  export let transform = (item: any) => item.value;

  let showOptions = false;

  function handleClick(e: MouseEvent) {
    showOptions = true;
  }
</script>

<svelte:window on:click|capture={() => showOptions = false}></svelte:window>

<main class={`select-container max-w-[13rem] relative cursor-pointer ` + (cl || '')}>
  <div
    on:click|self|stopPropagation={handleClick}
    class="content bg-gray-700 p-2 h-10 rounded-md select-none pr-8">{
    items.some(a => transform(a) === value) ? label( items.find(e => transform(e) === value) ) : placeholder
  }</div>
  <div class="expand w-5 h-5 absolute right-2 top-3 pointer-events-none">
    <ExpandIcon width="100%" height="100%"/>
  </div>
  <div class="options
    bg-gray-700 bg-opacity-100 p-2 w-full rounded-md border-2 border-gray-800
    absolute z-10 grid grid-cols-1 max-h-72 overflow-x-hidden overflow-y-scroll"
    class:visible={ showOptions }
    >
    {#each items as item, pos}
      <span
        class="option transition-all duration-200 hover:bg-gray-800 p-1 rounded-md"
        on:click={ () => {
          showOptions = false;
          value = transform(item);
          onChange(item, pos);
        } }>{ label(item) }</span>
    {/each}
  </div>
</main>

<style lang="postcss">
  .select-container {
    min-width: 10rem;
  }

  .options.visible {
    opacity: 1;
  }

  .options:not(.visible) {
    opacity: 0;
    pointer-events: none;
  }

  .option {
    position: relative;
  }

  .option:not(:first-child) {
    margin-top: .4rem;
  }

  .option:not(:last-child)::after {
    @apply bg-gray-500;

    content: '';
    width: 100%;
    height: 1px;
    position: absolute;
    bottom: -.2rem;
    left: 0;
  }
</style>