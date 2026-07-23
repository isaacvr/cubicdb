<script lang="ts">
  import type { Paginator } from "@classes/Paginator";
  import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
  } from "lucide-svelte";

  export let pg: Paginator;
  export let data: any[] = [];
  export let items: any[] = [];
  export let onupdate: () => void = () => {};

  function setPage(p: number) {
    p === -1 && pg.nextPage();
    p === -2 && pg.prevPage();
    p != -1 && p != -2 && pg.setPage(p);
    items = data.slice(pg.start, pg.end);
    onupdate();
  }

  $: {
    pg.setData(data);
    items = data.slice(pg.start, pg.end);
  }
</script>

<ul
  class={"w-max flex justify-center no-grid gap-2 mx-auto text-gray-400 " +
    (pg.pages > 1 ? "" : "hidden")}
>
  <li class="paginator-item">
    <button onclick={() => setPage(1)}> <ChevronsLeftIcon /> </button>
  </li>
  <li class="paginator-item">
    <button onclick={() => setPage(-2)}> <ChevronLeftIcon /> </button>
  </li>
  {#each pg.labels as lb}
    <li class="paginator-item" class:selected={pg.page === lb}>
      <button onclick={() => setPage(lb)}>{lb}</button>
    </li>
  {/each}
  <li class="paginator-item">
    <button onclick={() => setPage(-1)}> <ChevronRightIcon /> </button>
  </li>
  <li class="paginator-item">
    <button onclick={() => setPage(Infinity)}> <ChevronsRightIcon /> </button>
  </li>
</ul>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .paginator-item {
    @apply rounded-md;
  }

  .paginator-item button {
    @apply w-8 h-8 bg-violet-400/30 grid place-items-center rounded-md shadow-md
    transition-all duration-300 select-none
    
    hover:bg-violet-400/40 hover:text-gray-300;
  }

  .paginator-item.selected button {
    @apply bg-violet-500/60 hover:bg-violet-500/50 text-gray-200;
  }
</style>
