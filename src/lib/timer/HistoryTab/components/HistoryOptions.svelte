<script lang="ts">
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import type { Solve } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { FilterIcon, Share2Icon, TrashIcon } from "lucide-svelte";
  import { formatAverageShare } from "../historySharing";

  interface HistoryOptionsProps {
    hasSolves: boolean;
    solves: Solve[];
    ondeleteAll: () => void;
    oncopyText: (text: string) => void;
    onopenFilter: () => void;
  }

  let { hasSolves, solves, ondeleteAll, oncopyText, onopenFilter }: HistoryOptionsProps = $props();

  function shareAverage(n: number) {
    const text = formatAverageShare(solves, n);
    if (text) oncopyText(text);
  }
</script>

<div class="absolute top-3 right-2 my-3 mx-1 flex flex-col gap-2">
  {#if hasSolves}
    <Tooltip tooltipText={$localLang.TIMER.deleteAll} placement="left" keyBindings={["d"]}>
      <button onclick={ondeleteAll} class="cursor-pointer grid place-items-center">
        <TrashIcon size="1.2rem" />
      </button>
    </Tooltip>
  {/if}

  <Tooltip tooltipText={$localLang.TIMER.shareAo5} placement="left">
    <button onclick={() => shareAverage(5)} class="cursor-pointer grid place-items-center">
      <Share2Icon size="1.2rem" />
    </button>
  </Tooltip>

  <Tooltip tooltipText={$localLang.TIMER.shareAo12} placement="left">
    <button onclick={() => shareAverage(12)} class="cursor-pointer grid place-items-center">
      <Share2Icon size="1.2rem" />
    </button>
  </Tooltip>

  <Tooltip tooltipText={$localLang.global.filter} placement="left">
    <button onclick={onopenFilter} class="cursor-pointer grid place-items-center relative">
      <FilterIcon size="1.2rem" />
    </button>
  </Tooltip>
</div>
