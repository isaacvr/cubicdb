<script lang="ts">
  import type { AlgorithmTree } from "@interfaces";
  import ArrowIcon from '@icons/ChevronRight.svelte';
  import PencilIcon from '@icons/Pencil.svelte';
  import PlusIcon from '@icons/Plus.svelte';
  import DeleteIcon from '@icons/Delete.svelte';
  import { createEventDispatcher } from "svelte";

  export let obj: AlgorithmTree;

  const dispatch = createEventDispatcher();

  function toggleExpanded() {
    obj.expanded = !obj.expanded;
  }

  function editAlgorithm(a: Algorithm) {
    dispatch('edit', a);
  }

  function addSection(a: Algorithm) {
    dispatch('add', a);
  }

  function deleteSection(a: Algorithm) {
    dispatch('delete', a);
  }
</script>

<section class="tree relative" class:expanded={ obj.expanded }>
  <button class="header" on:click|stopPropagation={ toggleExpanded }>
    <div class="name">
      <div class="icon" class:hidden={ !obj.children.length }>
        <ArrowIcon size="1.2rem"/>
      </div>
      { obj.name + (obj.children.length ? ` (${ obj.children.length })` : '') }
    </div>
    <div class="actions pr-4">
      <button on:click|stopPropagation={ () => editAlgorithm(obj.alg) }><PencilIcon size="1.2rem"/></button>
      <button on:click|stopPropagation={ () => addSection(obj.alg) }><PlusIcon size="1.2rem"/></button>
      <button on:click|stopPropagation={ () => deleteSection(obj.alg) }><DeleteIcon size="1.2rem"/></button>
    </div>
  </button>

  <div class="content">
    <div>
      {#each obj.children as child (child.alg.parentPath + '/' + child.route)}
        <svelte:self obj={ child }
          on:edit={ (ev) => editAlgorithm(ev.detail) }
          on:add={ (ev) => addSection(ev.detail) }
          on:delete={ (ev) => deleteSection(ev.detail) }/>
      {/each}
    </div>
  </div>
</section>

<style lang="postcss">
  .tree {
    --anim-t: 300ms;
    @apply rounded-md px-4 py-2 text-gray-300;
    background-color: #555;
  }

  .tree .header {
    @apply py-2 hover:bg-black hover:bg-opacity-20 flex items-center
      transition-all duration-100 cursor-pointer rounded-sm;
  }

  .tree .header .name {
    @apply flex items-center;
  }

  .tree .header .actions {
    @apply flex ml-8 mr-auto pointer-events-none opacity-0 transition-all duration-200;
  }

  .tree .header:hover .actions {
    @apply pointer-events-auto opacity-100;
  }

  .tree > .header .actions button {
    padding: 0.2rem;
    border-radius: 50%;
    box-sizing: border-box;
    width: 1.8rem;
    height: 1.8rem;
    display: grid;
    place-items: center;
    margin-block: -1rem;
    transition: all var(--anim-t);
  }

  .tree > .header .actions button:hover {
    background: #fff4;
    box-shadow: 0px 0.1rem 1rem #0004;
  }

  .tree .content {
    display: grid;
    transition: grid-template-rows var(--anim-t);
  }

  .tree:not(.expanded) > .content {
    grid-template-rows: 0fr;
  }

  .tree.expanded > .content {
    grid-template-rows: 1fr;
  }

  .tree > .header .icon {
    transition: all var(--anim-t);
  }
  
  .tree:not(.expanded) > .header .icon {
    rotate: 0deg;
  }

  .tree.expanded > .header .icon {
    rotate: 90deg;
  }

  .tree .content > div {
    overflow: hidden;
  }
</style>