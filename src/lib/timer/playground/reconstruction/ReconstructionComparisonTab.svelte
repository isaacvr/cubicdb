<script lang="ts">
  import { Card } from "@lib/cubicdbKit";
  import { validateReconstruction } from "./ReconstructionTypes";

  interface Props {
    mainInput: string;
  }

  let { mainInput }: Props = $props();

  let comparisonInput = $state("");

  let comparisonResult = $derived.by(() => {
    if (!mainInput || !comparisonInput) return null;

    const main = validateReconstruction(mainInput);
    const comparison = validateReconstruction(comparisonInput);

    const mainSet = new Set(main.moves);
    const compSet = new Set(comparison.moves);
    const commonMoves = Array.from(mainSet).filter((m) => compSet.has(m)).length;
    const totalMoves = Math.max(main.moves.length, comparison.moves.length);
    const similarity = totalMoves > 0 ? (commonMoves / totalMoves) * 100 : 0;

    const differences: string[] = [];
    if (totalMoves < 100) {
      main.moves.forEach((m, i) => {
        if (comparison.moves[i] !== m) {
          differences.push(`Position ${i}: "${m}" vs "${comparison.moves[i] || "missing"}"`);
        }
      });
    }

    return { similarity, commonMoves, differences };
  });
</script>

<Card title="Compare Reconstructions">
  <div class="space-y-4">
    <div>
      <label class="label"><span class="label-text">Second Reconstruction</span></label>
      <textarea
        class="textarea textarea-bordered w-full h-24"
        placeholder="Enter another reconstruction to compare"
        bind:value={comparisonInput}
      />
    </div>

    {#if comparisonResult}
      <div class="grid grid-cols-2 gap-4">
        <div class="stat">
          <div class="stat-title">Similarity</div>
          <div class="stat-value text-lg">{comparisonResult.similarity.toFixed(1)}%</div>
        </div>
        <div class="stat">
          <div class="stat-title">Common Moves</div>
          <div class="stat-value text-lg">{comparisonResult.commonMoves}</div>
        </div>
      </div>

      {#if comparisonResult.differences.length > 0 && comparisonResult.differences.length <= 10}
        <div class="alert alert-warning">
          <p class="font-bold">Differences ({comparisonResult.differences.length})</p>
          <ul class="list-disc pl-5 mt-2 text-sm">
            {#each comparisonResult.differences as diff}
              <li>{diff}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </div>
</Card>
