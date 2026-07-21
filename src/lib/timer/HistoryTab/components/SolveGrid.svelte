<script lang="ts">
  import moment from "moment";
  import { MessageSquarePlusIcon } from "lucide-svelte";
  import { Penalty, type Solve } from "@interfaces";
  import { sTimer } from "@helpers/timer";

  interface SolveGridProps {
    solves: Solve[];
    onOpen: (solve: Solve, target: HTMLButtonElement) => void;
    onContextMenu: (event: MouseEvent, solve: Solve) => void;
    onGridElement?: (element: HTMLDivElement) => void;
  }

  let { solves = [], onOpen, onContextMenu, onGridElement }: SolveGridProps = $props();

  let gridElement: HTMLDivElement;

  $effect(() => {
    if (gridElement) {
      onGridElement?.(gridElement);
    }
  });
</script>

<div id="grid" class="pt-4 grid min-h-0 flex-1 overflow-auto" bind:this={gridElement}>
  {#each solves as solve (solve._id)}
    {@const stime = sTimer(solve, true)}
    <button
      class="shadow-md w-full h-full rounded-md p-1 bg-base-200 relative
        flex items-center justify-center transition-all duration-200 select-none cursor-pointer
        border border-primary/50
        hover:shadow-lg hover:shadow-primary/25 hover:bg-primary hover:text-primary-content
      "
      onclick={ev => onOpen(solve, ev.currentTarget)}
      oncontextmenu={e => onContextMenu(e, solve)}
      class:selected={solve.selected}
    >
      <div class="solve-row-date pointer-events-none font-small absolute top-0 left-2">
        {moment(solve.date).format("DD/MM")}
      </div>
      <span
        class={"solve-row-time pointer-events-none time text-center font-bold " +
          (stime === "DNF" ? "text-error font-bold" : "")}
      >
        {stime}
      </span>

      <div
        class="pointer-events-none absolute right-1 top-0 h-full flex flex-col items-center justify-evenly"
      >
        {#if solve.penalty === Penalty.P2}
          <span class="font-small text-error font-bold">+2</span>
        {/if}
        {#if solve.comments}
          <MessageSquarePlusIcon size="1rem" />
        {/if}
      </div>
    </button>
  {/each}
</div>

<style lang="postcss">
  @reference "@src/themes/index.css";

  #grid {
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    grid-auto-rows: 3rem;
    gap: 0.5rem;
    padding-bottom: 2rem;
    padding-right: 0.5rem;
    margin-right: 2.5rem;
  }

  .font-small {
    font-size: 0.7rem;
  }

  .selected {
    @apply bg-warning text-primary-content hover:shadow-warning;
  }
</style>
