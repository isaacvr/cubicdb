<script lang="ts">
  import { Button, Checkbox, Tooltip } from "$lib/cubicdbKit";
  import { localLang } from "@stores/language.service";
  import Select from "@material/Select.svelte";
  import { FieldAdaptor, GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { Writable } from "svelte/store";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import { getContext } from "svelte";
  import FieldSearch from "./FieldSearch.svelte";
  import { ChevronDownIcon, TrashIcon } from "lucide-svelte";

  export let gate: GateAdaptor;
  export let canDelete = true;
  export let ondelete: (gate: FieldAdaptor | GateAdaptor) => void = () => {};

  let expanded = true;

  const fields: Writable<SearchFilter[]> = getContext("advanced-search");

  function xor(a: boolean, b: boolean) {
    if ((a && !b) || (!a && b)) return true;
    return false;
  }

  function addFilter() {
    gate.blocks = [...gate.blocks, new FieldAdaptor($fields[0])];
  }

  function addGroup() {
    gate.blocks = [...gate.blocks, new GateAdaptor("and")];
  }

  function deleteGate() {
    ondelete(gate);
  }

  function handleDeleteBlock(field: FieldAdaptor | GateAdaptor) {
    gate.blocks = gate.blocks.filter(f => f != field);
  }
</script>

<div class="gate" class:expanded>
  <div class="header">
    {#if canDelete}
      <Tooltip tooltipText={$localLang.global.delete}>
        <Button size="xs" icon type="danger" onclick={deleteGate}>
          <TrashIcon size="1rem" />
        </Button>
      </Tooltip>
    {/if}

    <Select
      bind:value={gate.type}
      items={["and", "or"]}
      transform={e => e}
      label={e => e.toUpperCase()}
      class="border-none h-8"
      placement="right"
    />

    <Tooltip tooltipText={$localLang.global.invert}>
      <Checkbox bind:checked={gate.invert} class="cursor-pointer" />
    </Tooltip>

    <span class="text-xs">
      {$localLang.TIMER.gateResultIndicator[0]}
      <mark>{$localLang.global[xor(gate.type === "or", gate.invert) ? "true" : "false"]}</mark>
      {$localLang.TIMER.gateResultIndicator[1]}
      <mark> {$localLang.global[gate.type === "or" ? "true" : "false"]}</mark>
    </span>

    <button
      type="tertiary"
      class={"p-1 ml-auto action " + (expanded ? "expanded" : "")}
      onclick={() => (expanded = !expanded)}
    >
      <ChevronDownIcon size="1.2rem" />
    </button>
  </div>

  <div class="content">
    {#each gate.blocks as block}
      {#if block instanceof FieldAdaptor}
        <FieldSearch filter={block} ondelete={handleDeleteBlock} />
      {:else}
        <svelte:self gate={block} ondelete={handleDeleteBlock} />
      {/if}
    {/each}

    <div class="actions flex items-center gap-2 mx-auto">
      <Button type="tertiary" class="py-2" onclick={addFilter}>{$localLang.TIMER.addFilter}</Button>
      <Button type="tertiary" class="py-2" onclick={addGroup}>{$localLang.TIMER.addGroup}</Button>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .gate {
    @apply border border-gray-600 rounded-md overflow-clip grid transition-all duration-200;
    grid-template-rows: auto 1fr;
  }

  .gate:not(.expanded) {
    grid-template-rows: auto 0fr;
  }

  .header {
    @apply border-inherit bg-gray-900 flex gap-4 p-1 px-2 items-center;
  }

  .header .action {
    @apply transition-all duration-200;
  }

  .header .action.expanded {
    @apply rotate-180;
  }

  .gate.expanded > .header {
    @apply border-b;
  }

  .content {
    @apply overflow-hidden grid gap-4;
  }

  .gate.expanded > .content {
    @apply p-2 max-h-[80vh] overflow-auto;
  }
</style>
