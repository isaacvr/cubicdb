<script lang="ts">
  import { Heading } from "@lib/cubicdbKit";
  import { validateReconstruction, type ReconstructionAnalysis } from "./reconstruction/ReconstructionTypes";
  import ReconstructionInputTab from "./reconstruction/ReconstructionInputTab.svelte";
  import ReconstructionAnalysisTab from "./reconstruction/ReconstructionAnalysisTab.svelte";
  import ReconstructionComparisonTab from "./reconstruction/ReconstructionComparisonTab.svelte";
  import ReconstructionExportTab from "./reconstruction/ReconstructionExportTab.svelte";

  let activeTab = $state("input");
  let reconstructionInput = $state("");
  let analysis: ReconstructionAnalysis | null = $state(null);
  let currentIndex = $state(0);

  function parseReconstruction() {
    analysis = validateReconstruction(reconstructionInput);
    currentIndex = 0;
  }

  function nextMove() {
    if (analysis && currentIndex < analysis.moves.length - 1) {
      currentIndex++;
    }
  }

  function previousMove() {
    if (currentIndex > 0) {
      currentIndex--;
    }
  }

  function goToMove(idx: number) {
    if (analysis && idx >= 0 && idx < analysis.moves.length) {
      currentIndex = idx;
    }
  }
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Reconstruction Playground</Heading>

  <div class="tabs tabs-bordered">
    {#each [
      { id: "input", label: "Input & Parse" },
      { id: "analysis", label: "Analysis" },
      { id: "comparison", label: "Comparison" },
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

  {#if activeTab === "input"}
    <ReconstructionInputTab
      input={reconstructionInput}
      {analysis}
      onInputChange={(v) => (reconstructionInput = v)}
      onParse={parseReconstruction}
    />
  {:else if activeTab === "analysis"}
    <ReconstructionAnalysisTab
      {analysis}
      {currentIndex}
      onNext={nextMove}
      onPrevious={previousMove}
      onGoTo={goToMove}
    />
  {:else if activeTab === "comparison"}
    <ReconstructionComparisonTab mainInput={reconstructionInput} />
  {:else if activeTab === "export"}
    <ReconstructionExportTab input={reconstructionInput} {analysis} />
  {/if}
</div>
