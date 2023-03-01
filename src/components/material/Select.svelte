<script lang="ts">
  import ExpandIcon from '@icons/ChevronDown.svelte';
  import { tick } from 'svelte';

  let cl = '';
  export { cl as class };
  export let placeholder: any = 'Select';
  export let value: any = placeholder;
  export let items: any[];
  export let onChange = (item?: any, pos?: number, arr?: any) => {};
  export let label = (item?: any) => (item || "");
  export let transform = (item: any, pos?: number, arr?: any) => item.value;

  let showOptions = false;
  let optionList: HTMLDivElement;

  function findValuePosition() {
    for (let i = 0, maxi = items.length; i < maxi; i += 1) {
      if ( transform(items[i], i, items) === value ) {
        return i;
      }
    }

    return -1;
  }

  function handleClick(e: MouseEvent) {
    let pos = findValuePosition();

    if ( pos > -1 ) {
      optionList.children[pos * 2].scrollIntoView({ inline: 'center', block: 'center' });
      tick().then(() => {
        (optionList.firstElementChild as HTMLButtonElement)?.focus();
      });
    }

    showOptions = true;
  }

  function focusHandler(e: KeyboardEvent) {
    let focused = document.activeElement;

    let prev = (el: Element) => el.previousElementSibling;
    let next = (el: Element) => el.nextElementSibling;

    if ( e.code === 'ArrowDown' || e.code === 'ArrowUp' ) {
      while( focused ) {
        focused = e.code === 'ArrowDown' ? next(focused) : prev(focused);
        if ( focused && focused.tagName === 'BUTTON' ) {
          tick().then(() => (focused as HTMLButtonElement).focus());
          break;
        }
      }  
    }
  }
</script>

<svelte:window on:click|capture={() => showOptions = false}></svelte:window>

<main class={`select-container relative cursor-pointer border border-solid border-gray-400 h-max-10 rounded-md ` + (cl || '')}>
  <button tabindex="0"
    on:click|self|stopPropagation={handleClick}
    class="
      bg-gray-700 text-gray-200 p-2 flex items-center rounded-md select-none pr-8
      whitespace-nowrap text-ellipsis w-full h-full text-left overflow-hidden">{
    items.some((a, p, i) => transform(a, p, i) === value)
      ? label( items.find((e, p, i) => transform(e, p, i) === value) )
      : placeholder
  }</button>
  <div class="expand w-5 h-full absolute right-2 top-0 flex my-auto pointer-events-none">
    <ExpandIcon width="100%" height="100%"/>
  </div>
  <div class="options
    bg-gray-700 bg-opacity-100 p-2 w-full rounded-md border border-solid border-gray-400
    absolute z-10 grid grid-cols-1 max-h-72 overflow-x-hidden overflow-y-scroll"
    class:visible={ showOptions } bind:this={ optionList }
    on:keydown={ focusHandler }
    >
    {#each items as item, pos}
      {#if pos}
        <hr class="h-0 w-full border-0 border-t border-gray-500">
      {/if}
      <button
        class="option text-gray-300 text-left transition-all duration-200 hover:bg-gray-800 p-1 rounded-md"
        class:selected={ transform(item, pos, items) === value }
        on:click={ () => {
          showOptions = false;
          value = transform(item, pos, items);
          onChange(item, pos, items);
        } }>{ label(item) }</button>
    {/each}
  </div>
</main>

<style lang="postcss">
  .select-container {
    max-width: 13rem;
  }

  .options.visible {
    opacity: 1;
    visibility: visible;
  }

  .options:not(.visible) {
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
  }

  .option {
    position: relative;
    scroll-padding-top: .25rem;
  }

  .option.selected {
    @apply bg-blue-600 text-gray-100 hover:bg-blue-400;
  }

  .option:not(:first-child) {
    margin-top: .4rem;
  }

  .option:not(:last-child) {
    margin-bottom: .4rem;
  }
</style>