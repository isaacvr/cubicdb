<script lang="ts">
  import Modal from "@components/Modal.svelte";
  import AdvancedSearch from "./AdvancedSearch/AdvancedSearch.svelte";
  import type { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import { localLang } from "@stores/language.service";
  import { timer } from "@helpers/timer";

  interface AdvancedSearchModalProps {
    show?: boolean;
    gate: GateAdaptor;
    onapply: () => void;
  }

  let { show = $bindable(false), gate = $bindable(), onapply }: AdvancedSearchModalProps = $props();

  const fields: SearchFilter[] = [
    { field: "time", name: $localLang.global.time, type: "map", fn: t => timer(t, true) },
    { field: "date", name: $localLang.global.date, type: "date" },
    { field: "comments", name: $localLang.TIMER.comments, type: "string" },
  ];
</script>

<Modal bind:show class="max-w-xl w-full shaded-card">
  <AdvancedSearch {fields} bind:gate onclose={() => (show = false)} {onapply} />
</Modal>
