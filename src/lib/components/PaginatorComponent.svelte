<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Paginator } from "@classes/Paginator";
  import ChevronLeftIcon from "@icons/ChevronLeft.svelte";
  import ChevronRightIcon from "@icons/ChevronRight.svelte";
  import ChevronDoubleLeftIcon from "@icons/ChevronDoubleLeft.svelte";
  import ChevronDoubleRightIcon from "@icons/ChevronDoubleRight.svelte";

  export let pg: Paginator;

  const dispatch = createEventDispatcher();

  function setPage(p: number) {
    p === -1 && pg.nextPage();
    p === -2 && pg.prevPage();
    p != -1 && p != -2 && pg.setPage(p);
    dispatch("update");
  }
</script>

<ul
  class={"w-max flex justify-center no-grid gap-2 mx-auto text-gray-400 " +
    (pg.pages > 1 ? "" : "hidden")}
>
  <li class="paginator-item">
    <button on:click={() => setPage(1)}> <ChevronDoubleLeftIcon /> </button>
  </li>
  <li class="paginator-item">
    <button on:click={() => setPage(-2)}> <ChevronLeftIcon /> </button>
  </li>
  {#each pg.labels as lb}
    <li class="paginator-item" class:selected={pg.page === lb}>
      <button on:click={() => setPage(lb)}>{lb}</button>
    </li>
  {/each}
  <li class="paginator-item">
    <button on:click={() => setPage(-1)}> <ChevronRightIcon /> </button>
  </li>
  <li class="paginator-item">
    <button on:click={() => setPage(Infinity)}> <ChevronDoubleRightIcon /> </button>
  </li>
</ul>

<style lang="postcss">
  .paginator-item {
    @apply rounded-md;
  }

  .paginator-item button {
    @apply w-8 h-8 bg-violet-400 bg-opacity-30 grid place-items-center rounded-md shadow-md
    transition-all duration-300 select-none
    
    hover:bg-opacity-40 hover:text-gray-300;
  }

  .paginator-item.selected button {
    @apply bg-violet-500 text-gray-200 bg-opacity-60 hover:bg-opacity-50;
  }
</style>
