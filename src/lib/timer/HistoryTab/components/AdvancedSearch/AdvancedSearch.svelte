<script lang="ts">
  import { onMount, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { Button } from "$lib/cubicdbKit";
  import { localLang } from "@stores/language.service";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import GateSearch from "./GateSearch.svelte";

  export let fields: SearchFilter[];
  export let gate: GateAdaptor;
  export let onclose: () => void = () => {};
  export let onapply: () => void = () => {};

  const _fields = writable(fields);
  setContext<Writable<SearchFilter[]>>("advanced-search", _fields);

  function close() {
    onclose();
  }

  function apply() {
    onapply();
  }

  function clear() {
    gate.blocks = [];
    onapply();
  }

  onMount(() => {});

  $: _fields.set(fields);
</script>

<section class="grid">
  <GateSearch canDelete={false} {gate} />

  <div class="actions flex gap-2 justify-center mt-4">
    <Button class="py-2" type="secondary" onclick={close}>{$localLang.global.cancel}</Button>
    <Button class="py-2" type="success" onclick={apply}>{$localLang.global.filter}</Button>
    <Button class="py-2" type="warning" onclick={clear}>{$localLang.global.clear}</Button>
  </div>
</section>
