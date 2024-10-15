<script lang="ts">
  import { Button, Input } from "flowbite-svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import Select from "@material/Select.svelte";
  import type { InternalFilter, SearchFilter } from "./adaptors/types";
  import type { Writable } from "svelte/store";
  import { createEventDispatcher, getContext } from "svelte";
  import { FieldAdaptor } from "./adaptors";
  import OperatorIcon from "./OperatorIcon.svelte";
  import { localLang } from "@stores/language.service";

  const dispatch = createEventDispatcher();
  const fields: Writable<SearchFilter[]> = getContext("advanced-search");

  export let filter: FieldAdaptor;

  function updateField(s: SearchFilter) {
    filter.setField(s);
    filter = filter;
  }

  function updateOperator(f: InternalFilter) {
    filter.setFilter(f);
    filter = filter;
  }

  function deleteFilter() {
    dispatch("delete", filter);
  }

  function getLabel(e: InternalFilter) {
    return $localLang.TIMER.operators[e.code];
  }
</script>

<div
  class="flex gap-2 items-center justify-center bg-gray-900 rounded-md border-2 border-green-600 p-1 px-2"
>
  <Button class="p-1 h-6" color="red" on:click={deleteFilter}>
    <DeleteIcon size="1rem" />
  </Button>

  <!-- Fields -->
  <Select
    value={filter.field}
    items={$fields}
    transform={e => e}
    label={e => e.name}
    placement="right"
    onChange={e => updateField(e)}
  />

  <!-- Operators -->
  <Select
    value={filter.filter}
    items={filter.filters}
    transform={e => e}
    label={getLabel}
    onChange={e => updateOperator(e)}
    hasIcon={e => e.code}
    iconComponent={OperatorIcon}
    iconKey="operator"
    preferIcon
    placement="right"
  />

  <!-- Params -->
  {#each filter.params as p}
    <Input
      bind:value={p}
      type={filter.filter.type === "string" || filter.filter.type === "map"
        ? "text"
        : filter.filter.type}
      class="px-2 py-2 max-w-[15rem] !bg-transparent ml-auto"
    />
  {/each}
</div>
