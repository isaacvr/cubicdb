<script lang="ts">
  import type { AlgorithmTree } from "@interfaces";
  import ArrowIcon from '@icons/ChevronRight.svelte';
  import EditIcon from '@icons/Pencil.svelte';
  import { createEventDispatcher } from "svelte";

  export let obj: AlgorithmTree;

  const dispatch = createEventDispatcher();

  function toggleExpanded() {
    obj.expanded = !obj.expanded;
  }

  function editAlgorithm(a: Algorithm) {
    dispatch('edit', a);
  }
</script>

<section class="tree relative" class:expanded={ obj.expanded }>
  <header on:click|stopPropagation={ toggleExpanded }>
    <div class="name">
      <div class="icon" class:hidden={ !obj.children.length }>
        <ArrowIcon size="1.2rem"/>
      </div>
      { obj.name }
    </div>
    <div class="actions pr-4">
      <span on:click|stopPropagation={ () => editAlgorithm(obj.alg) }><EditIcon size="1.2rem"/></span>
    </div>
  </header>

  <div class="content">
    <div>
      {#each obj.children as child (child.alg.parentPath + '/' + child.route)}
        <svelte:self obj={ child } on:edit={ (ev) => editAlgorithm(ev.detail) }/>
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

  .tree header {
    @apply py-2 hover:bg-black hover:bg-opacity-20 flex items-center
      transition-all duration-100 cursor-pointer rounded-sm;
  }

  .tree header .name {
    @apply flex items-center;
  }

  .tree header .actions {
    @apply flex ml-8 mr-auto pointer-events-none opacity-0 transition-all duration-200;
  }

  .tree header:hover .actions {
    @apply pointer-events-auto opacity-100;
  }

  .tree > header .actions span {
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

  .tree > header .actions span:hover {
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

  .tree > header .icon {
    transition: all var(--anim-t);
  }
  
  .tree:not(.expanded) > header .icon {
    rotate: 0deg;
  }

  .tree.expanded > header .icon {
    rotate: 90deg;
  }

  .tree .content > div {
    overflow: hidden;
  }
</style>