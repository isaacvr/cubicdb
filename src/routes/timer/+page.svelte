<script lang="ts">
  import Select from "@components/material/Select.svelte";
  import { localLang } from "@stores/language.service";
  import { LayoutGrid, Plus, Table2 } from "lucide-svelte";

  let sortBy: "name" = $state("name");
  let sortCmp: "asc" | "desc" = $state("asc");
  let layout: "card" | "table" = $state("card");
</script>

<div class="actions flex justify-between">
  <div class="sorting flex gap-2 items-center">
    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortBy}
      items={[{ value: "name", label: $localLang.global.name }]}
      transform={e => e.value}
      label={e => e.label}
    />

    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortCmp}
      items={[
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ]}
      transform={e => e.value}
      label={e => e.label}
    />
  </div>

  <div class="layout">
    <div class="join">
      <button class="btn join-item"><LayoutGrid /></button>
      <button class="btn join-item"><Table2 /></button>
    </div>

    <button class="btn py-1">
      <Plus />
      {$localLang.TIMER.addNewSession}
    </button>
  </div>
</div>
