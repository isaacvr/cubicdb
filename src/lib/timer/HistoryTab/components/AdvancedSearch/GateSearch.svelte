<script lang="ts">
  import { Button, Checkbox, Tooltip } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import Select from "@material/Select.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import ChevronIcon from "@icons/ChevronDown.svelte";
  import { FieldAdaptor, GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { Writable } from "svelte/store";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import { createEventDispatcher, getContext } from "svelte";
  import FieldSearch from "./FieldSearch.svelte";

  export let gate: GateAdaptor;
  export let canDelete = true;

  let expanded = true;

  const dispatch = createEventDispatcher();
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
    dispatch("delete", gate);
  }

  function handleDeleteBlock(ev: CustomEvent<FieldAdaptor | GateAdaptor>) {
    let field = ev.detail;
    gate.blocks = gate.blocks.filter(f => f != field);
  }
</script>

<div class="gate" class:expanded>
  <div class="header">
    {#if canDelete}
      <Button class="p-1" color="red" on:click={deleteGate}>
        <DeleteIcon size="1rem" />
      </Button>
      <Tooltip>{$localLang.global.delete}</Tooltip>
    {/if}

    <Select
      bind:value={gate.type}
      items={["and", "or"]}
      transform={e => e}
      label={e => e.toUpperCase()}
      class="border-none h-8"
      placement="right"
    />

    <Checkbox bind:checked={gate.invert} class="cursor-pointer" />
    <Tooltip>{$localLang.global.invert}</Tooltip>

    <span class="text-xs">
      {$localLang.TIMER.gateResultIndicator[0]}
      <mark>{$localLang.global[xor(gate.type === "or", gate.invert) ? "true" : "false"]}</mark>
      {$localLang.TIMER.gateResultIndicator[1]}
      <mark> {$localLang.global[gate.type === "or" ? "true" : "false"]}</mark>
    </span>

    <button
      color="none"
      class={"p-1 ml-auto action " + (expanded ? "expanded" : "")}
      on:click={() => (expanded = !expanded)}
    >
      <ChevronIcon size="1.2rem" />
    </button>
  </div>

  <div class="content">
    {#each gate.blocks as block}
      {#if block instanceof FieldAdaptor}
        <FieldSearch filter={block} on:delete={handleDeleteBlock} />
      {:else}
        <svelte:self gate={block} on:delete={handleDeleteBlock} />
      {/if}
    {/each}

    <div class="actions flex items-center gap-2 mx-auto">
      <Button color="none" class="py-2" on:click={addFilter}>{$localLang.TIMER.addFilter}</Button>
      <Button color="none" class="py-2" on:click={addGroup}>{$localLang.TIMER.addGroup}</Button>
    </div>
  </div>
</div>

<style lang="postcss">
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
