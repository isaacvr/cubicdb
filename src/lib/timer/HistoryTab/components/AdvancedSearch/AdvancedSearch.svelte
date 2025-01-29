<script lang="ts">
  import { createEventDispatcher, onMount, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { Button } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import GateSearch from "./GateSearch.svelte";

  export let fields: SearchFilter[];
  export let gate: GateAdaptor;

  const dispatch = createEventDispatcher();
  const _fields = writable(fields);
  setContext<Writable<SearchFilter[]>>("advanced-search", _fields);

  function close() {
    dispatch("close");
  }

  function apply() {
    dispatch("apply");
  }

  function clear() {
    gate.blocks = [];
    dispatch("apply");
  }

  onMount(() => {});

  $: _fields.set(fields);
</script>

<section class="grid">
  <GateSearch canDelete={false} {gate} />

  <div class="actions flex gap-2 justify-center mt-4">
    <Button class="py-2" color="alternative" on:click={close}>{$localLang.global.cancel}</Button>
    <Button class="py-2" color="green" on:click={apply}>{$localLang.global.filter}</Button>
    <Button class="py-2" color="yellow" on:click={clear}>{$localLang.global.clear}</Button>
  </div>
</section>
