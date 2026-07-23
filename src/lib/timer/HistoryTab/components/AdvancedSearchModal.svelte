<script lang="ts">
  import Modal from "@components/Modal.svelte";
  import AdvancedSearch from "./AdvancedSearch/AdvancedSearch.svelte";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import type { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";

  interface AdvancedSearchModalProps {
    show?: boolean;
    fields: SearchFilter[];
    gate: GateAdaptor;
    onapply: () => void;
  }

  let {
    show = $bindable(false),
    fields,
    gate = $bindable(),
    onapply,
  }: AdvancedSearchModalProps = $props();
</script>

<Modal bind:show class="max-w-xl w-full shaded-card">
  <AdvancedSearch {fields} bind:gate onclose={() => (show = false)} {onapply} />
</Modal>
