<script lang="ts">
  import { Button, Card } from "@lib/cubicdbKit";
  import { MOVE_GROUPS, type ReconstructionAnalysis } from "./ReconstructionTypes";

  interface Props {
    analysis: ReconstructionAnalysis | null;
    currentIndex: number;
    onNext: () => void;
    onPrevious: () => void;
    onGoTo: (idx: number) => void;
  }

  let { analysis, currentIndex, onNext, onPrevious, onGoTo }: Props = $props();

  let cubeState = $derived(
    analysis ? analysis.moves.slice(0, currentIndex + 1).join(" ") : ""
  );
</script>

<Card title="Reconstruction Analysis">
  {#if analysis}
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="stat">
        <div class="stat-title">Moves</div>
        <div class="stat-value">{analysis.moveCount}</div>
      </div>
      <div class="stat">
        <div class="stat-title">HTM</div>
        <div class="stat-value text-primary">{analysis.htm}</div>
      </div>
      <div class="stat">
        <div class="stat-title">STM</div>
        <div class="stat-value text-info">{analysis.stm}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Efficiency</div>
        <div class="stat-value text-success">
          {analysis.stm > 0 ? ((analysis.htm / analysis.stm) * 100).toFixed(1) : 0}%
        </div>
      </div>
    </div>

    <div class="divider">Move Sequence Navigation</div>

    <div class="flex gap-2 mb-4 flex-wrap">
      <Button onclick={onPrevious} class="btn-sm">← Previous</Button>
      <Button onclick={onNext} class="btn-sm">Next →</Button>
    </div>

    <div class="bg-gray-100 p-4 rounded-lg mb-4 min-h-12">
      <p class="font-mono text-sm">
        <strong>Current State (0 to {currentIndex}):</strong><br />
        {cubeState}
      </p>
    </div>

    <div class="overflow-x-auto">
      <div class="flex gap-1 py-2 pb-4">
        {#each analysis.moves as move, idx (idx)}
          <button
            class="btn btn-sm {idx === currentIndex ? 'btn-primary' : idx < currentIndex ? 'btn-success' : 'btn-outline'}"
            onclick={() => onGoTo(idx)}
          >
            {move}
          </button>
        {/each}
      </div>
    </div>

    <div class="divider">Move Analysis</div>
    <div class="grid grid-cols-3 gap-2">
      <div class="stat">
        <div class="stat-title">Rotations</div>
        <div class="stat-value">{analysis.moves.filter((m) => MOVE_GROUPS.rotations.includes(m)).length}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Slices</div>
        <div class="stat-value">{analysis.moves.filter((m) => MOVE_GROUPS.sliceMoves.includes(m)).length}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Wide Moves</div>
        <div class="stat-value">{analysis.moves.filter((m) => m.includes("w")).length}</div>
      </div>
    </div>
  {:else}
    <p class="text-gray-500 text-center py-8">Parse a reconstruction to see analysis</p>
  {/if}
</Card>
