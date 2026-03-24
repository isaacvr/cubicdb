<script lang="ts">
  import type { Solve } from "@lib/interfaces";
  import { Penalty } from "@lib/interfaces";
  import { Heading } from "@lib/cubicdbKit";
  import SolveAddTab from "./solve/SolveAddTab.svelte";
  import SolveListTab from "./solve/SolveListTab.svelte";
  import SolveStatsTab from "./solve/SolveStatsTab.svelte";
  import SolveExportTab from "./solve/SolveExportTab.svelte";
  import { SvelteSet } from "svelte/reactivity";

  let activeTab = $state("add");
  let solves: Solve[] = $state([]);
  let selectedIds: SvelteSet<string> = new SvelteSet();
  let searchText = $state("");
  let sortBy: "time" | "date" | "penalty" = $state("date");

  let filteredSolves = $derived.by(() => {
    let result = solves.filter((s) => {
      if (searchText && !s.comments?.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "time": return a.time - b.time;
        case "penalty": return a.penalty - b.penalty;
        case "date":
        default: return b.date - a.date;
      }
    });

    return result;
  });

  function addSolve(time: number, penalty: Penalty, comments: string, scramble: string) {
    solves = [...solves, {
      _id: `solve-${Date.now()}-${Math.random()}`,
      time,
      date: Date.now(),
      scramble,
      penalty,
      selected: false,
      session: "playground",
      comments,
      group: 0,
      mode: "333",
      len: 3,
    }];
  }

  function deleteSolve(id: string) {
    solves = solves.filter((s) => s._id !== id);
    selectedIds.delete(id);
  }

  function deleteSelected() {
    solves = solves.filter((s) => !selectedIds.has(s._id!));
    selectedIds.clear();
  }

  function toggleSelect(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
  }

  function selectAll() {
    solves.forEach((s) => selectedIds.add(s._id!));
  }

  function deselectAll() {
    selectedIds.clear();
  }

  function updateSolve(id: string, updates: Partial<Solve>) {
    solves = solves.map((s) => (s._id === id ? { ...s, ...updates } : s));
  }

  function applyPenaltyToSelected(penalty: Penalty) {
    const ids = new Set(selectedIds);
    solves = solves.map((s) => (ids.has(s._id!) ? { ...s, penalty } : s));
  }
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Solve Playground</Heading>

  <div class="tabs tabs-bordered">
    {#each [
      { id: "add", label: "Add Solve" },
      { id: "list", label: "List & Edit" },
      { id: "stats", label: "Statistics" },
      { id: "export", label: "Export" },
    ] as tab (tab.id)}
      <button
        class="tab {activeTab === tab.id ? 'tab-active' : ''}"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === "add"}
    <SolveAddTab onAdd={addSolve} />
  {:else if activeTab === "list"}
    <SolveListTab
      solves={filteredSolves}
      {selectedIds}
      onDelete={deleteSolve}
      onDeleteSelected={deleteSelected}
      onToggleSelect={toggleSelect}
      onSelectAll={selectAll}
      onDeselectAll={deselectAll}
      onUpdate={updateSolve}
      onApplyPenaltyToSelected={applyPenaltyToSelected}
      {sortBy}
      onSortChange={(s) => (sortBy = s)}
      {searchText}
      onSearchChange={(t) => (searchText = t)}
    />
  {:else if activeTab === "stats"}
    <SolveStatsTab {solves} />
  {:else if activeTab === "export"}
    <SolveExportTab {solves} />
  {/if}
</div>
