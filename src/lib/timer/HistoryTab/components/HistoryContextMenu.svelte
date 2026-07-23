<script lang="ts">
  import type { Solve } from "@interfaces";
  import { dataService } from "$lib/data-services/data.service";
  import { isMo3 } from "@helpers/timer";
  import { localLang } from "@stores/language.service";
  import { averageSummaryFromSolve, solveIndex as getSolveIndex } from "../historySharing";
  import {
    CopyIcon,
    Dice3Icon,
    Dice5Icon,
    DicesIcon,
    PencilIcon,
    SquareDashedIcon,
    TrashIcon,
  } from "lucide-svelte";

  interface HistoryContextMenuProps {
    solves: Solve[];
    sessionMode?: string;
    onedit: (solve: Solve) => void;
    onselect: (solve: Solve) => void;
    ondelete: (solve: Solve) => void;
    oncopyText: (text: string) => void;
  }

  let {
    solves,
    sessionMode = "",
    onedit,
    onselect,
    ondelete,
    oncopyText,
  }: HistoryContextMenuProps = $props();

  let solve: Solve | undefined = $state();
  let show = $state(false);
  let contextMenuElement: HTMLUListElement;

  export function close() {
    show = false;
  }

  export function open(e: MouseEvent, selectedSolve: Solve) {
    e.stopPropagation();
    e.preventDefault();

    const dims = contextMenuElement.getBoundingClientRect();
    const zoom = $dataService.config.global.zoomFactor / 100;
    const footerHeight = 2.5 * 16 * zoom;
    const sideSpace = 2.5 * 16 * zoom;
    const availableHeight = document.body.clientHeight - footerHeight;
    const availableWidth = document.body.clientWidth - sideSpace;

    contextMenuElement.style.left = Math.min(e.clientX, availableWidth - dims.width) + "px";
    contextMenuElement.style.top = Math.min(e.clientY, availableHeight - dims.height) + "px";

    solve = selectedSolve;
    show = true;
  }

  function solveIndex() {
    return solve ? getSolveIndex(solves, solve) : -1;
  }

  function copyAverage(n: number) {
    if (!solve) return;
    oncopyText(averageSummaryFromSolve(solves, solve, n));
  }

  function openAverageSize() {
    return isMo3(sessionMode) ? 3 : 5;
  }
</script>

<ul
  class="context-menu w-max p-2 rounded-md shadow-md fixed top-8 left-28 bg-base-100
    grid gap-1 pointer-events-none opacity-0 invisible"
  class:active={show}
  bind:this={contextMenuElement}
>
  {#if solve}
    <li>
      <button onclick={() => onedit(solve)}>
        <PencilIcon size="1.2rem" />
        {$localLang.TIMER.edit}
      </button>
    </li>
    <li>
      <button onclick={() => onselect(solve)}>
        <SquareDashedIcon size="1.2rem" />
        {$localLang.TIMER.select}
      </button>
    </li>
    <li>
      <button onclick={() => oncopyText(solve.scramble)}>
        <CopyIcon size="1.2rem" />
        {$localLang.TIMER.copyScramble}
      </button>
    </li>
    {#if solveIndex() >= openAverageSize()}
      <li>
        <button onclick={() => copyAverage(openAverageSize())}>
          {#if isMo3(sessionMode)}
            <Dice3Icon size="1.2rem" /> {$localLang.global.copy} Mo3
          {:else}
            <Dice5Icon size="1.2rem" /> {$localLang.global.copy} Ao5
          {/if}
        </button>
      </li>
    {/if}

    {#if solveIndex() >= 12}
      <li>
        <button onclick={() => copyAverage(12)}>
          <DicesIcon size="1.2rem" />
          {$localLang.global.copy} Ao12
        </button>
      </li>
    {/if}
    <li>
      <button onclick={() => ondelete(solve)}>
        <TrashIcon size="1.2rem" />
        {$localLang.global.delete}
      </button>
    </li>
  {/if}
</ul>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .context-menu.active {
    @apply pointer-events-auto opacity-100 visible;
  }

  .context-menu li {
    @apply pointer-events-none;
  }

  .context-menu li button {
    @apply pointer-events-auto pr-2 hover:pl-2 hover:pr-1 p-1 rounded-md transition-all duration-200
    hover:bg-white/10 w-full flex gap-2 justify-start items-center;
  }
</style>
