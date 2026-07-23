<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { localLang } from "@stores/language.service";

  interface HistorySelectionToolbarProps {
    selectedCount: number;
    onselectAll: () => void;
    onselectInterval: () => void;
    oninvertSelection: () => void;
    oncancel: () => void;
    ondeleteSelected: () => void;
  }

  let {
    selectedCount,
    onselectAll,
    onselectInterval,
    oninvertSelection,
    oncancel,
    ondeleteSelected,
  }: HistorySelectionToolbarProps = $props();

  const SHORTCUT_CLASS =
    "kbd kbd-sm border-warning bg-warning text-xs font-bold text-warning-content shadow-sm";
</script>

<div
  class:isVisible={selectedCount}
  class="fixed rounded-md p-2 top-0 opacity-0 transition-all duration-300 shadow-md shadow-base-100
    pointer-events-none flex flex-wrap max-w-full justify-evenly actions bg-base-200 z-20"
>
  <Button aria-label={$localLang.TIMER.selectAll} onclick={onselectAll}>
    {$localLang.TIMER.selectAll} &nbsp; <span class={SHORTCUT_CLASS}>A</span>
  </Button>

  <Button aria-label={$localLang.TIMER.selectInterval} onclick={onselectInterval}>
    {$localLang.TIMER.selectInterval} &nbsp;
    <span class={SHORTCUT_CLASS}>T</span>
  </Button>

  <Button aria-label={$localLang.TIMER.invertSelection} onclick={oninvertSelection}>
    {$localLang.TIMER.invertSelection} &nbsp;
    <span class={SHORTCUT_CLASS}>V</span>
  </Button>

  <Button aria-label={$localLang.global.cancel} onclick={oncancel}>
    {$localLang.global.cancel} &nbsp; <span class={SHORTCUT_CLASS}>Esc</span>
  </Button>

  <Button aria-label={$localLang.global.delete} onclick={ondeleteSelected}>
    {$localLang.global.delete} &nbsp; <span class={SHORTCUT_CLASS}>D</span>
  </Button>
</div>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .actions {
    left: 50%;
    transform: translateX(-50%);
    width: min(100%, 40rem);
  }

  .isVisible {
    @apply top-4 z-50 opacity-100 pointer-events-auto;
  }
</style>
