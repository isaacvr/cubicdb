<script lang="ts">
  import WcaCategory from '@components/wca/WCACategory.svelte';
  import { minmax } from '@helpers/math';
  import ExpandIcon from '@icons/ChevronDown.svelte';
  
  import { Button, Dropdown, DropdownDivider, DropdownItem } from "flowbite-svelte";

  let cl = '';
  export { cl as class };
  export let placeholder: string = '';
  export let value: any = placeholder;
  export let items: any[];
  export let onChange = (item?: any, pos?: number, arr?: any[]) => {};
  export let label = (item?: any) => (item || "");
  export let transform = (item: any, pos?: number, arr?: any[]) => item.value;
  export let hasIcon: null | ((v: any) => any) = null;

  const selectID = "00000000".split("").map(_ => (10 + minmax(~~(Math.random() * 6), 0, 5)).toString(16)).join('');

  let showOptions = false;
  // let optionList: HTMLDivElement;

  function findValuePosition() {
    for (let i = 0, maxi = items.length; i < maxi; i += 1) {
      if ( transform(items[i], i, items) === value ) {
        return i;
      }
    }

    return -1;
  }

  function handleClick() {
    let list = document.querySelector(`#${ selectID }`);

    if ( !list ) return;

    let pos = findValuePosition();

    if ( pos > -1 ) {
      list.children[0].children[pos * 2].scrollIntoView({ block: 'center' });
    }
  }
</script>

<Button color="alternative" class={'gap-1 ' + cl} on:click={ handleClick }>{
  items.some((a, p, i) => transform(a, p, i) === value)
    ? label( items.find((e, p, i) => transform(e, p, i) === value) )
    : placeholder
  }
  <ExpandIcon size="1.2rem" class="ml-auto"/>
</Button>

<Dropdown bind:open={ showOptions } id={ selectID } class="max-h-[20rem] overflow-y-scroll">
  {#each items as item, pos}
    {#if pos} <DropdownDivider /> {/if}
    
    <DropdownItem class={
        `flex items-center gap-2
        ` + (transform(item, pos, items) === value ? 'bg-primary-600 text-white dark:hover:bg-primary-400' : '')
      } on:click={ () => {
      showOptions = false;
      value = transform(item, pos, items);
      onChange(item, pos, items);
    }}>
      {#if hasIcon }
        <WcaCategory icon={ hasIcon(item) } noFallback size="1.1rem"/>
      {/if}
      { label(item) }
    </DropdownItem>
  {/each}
</Dropdown>