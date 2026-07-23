<script lang="ts">
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import { localLang } from "@stores/language.service";
  import { FilterIcon, Share2Icon, TrashIcon } from "lucide-svelte";

  interface HistoryOptionsProps {
    hasSolves: boolean;
    ondeleteAll: () => void;
    onshareAo5: () => void;
    onshareAo12: () => void;
    onopenFilter: () => void;
  }

  let { hasSolves, ondeleteAll, onshareAo5, onshareAo12, onopenFilter }: HistoryOptionsProps =
    $props();
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
    <button onclick={onshareAo5} class="cursor-pointer grid place-items-center">
      <Share2Icon size="1.2rem" />
    </button>
  </Tooltip>

  <Tooltip tooltipText={$localLang.TIMER.shareAo12} placement="left">
    <button onclick={onshareAo12} class="cursor-pointer grid place-items-center">
      <Share2Icon size="1.2rem" />
    </button>
  </Tooltip>

  <Tooltip tooltipText={$localLang.global.filter} placement="left">
    <button onclick={onopenFilter} class="cursor-pointer grid place-items-center relative">
      <FilterIcon size="1.2rem" />
    </button>
  </Tooltip>
</div>
