<script lang="ts">
  import { Button, Card } from "@lib/cubicdbKit";
  import type { ReconstructionAnalysis } from "./ReconstructionTypes";

  interface Props {
    input: string;
    analysis: ReconstructionAnalysis | null;
  }

  let { input, analysis }: Props = $props();

  function exportAnalysis() {
    if (!analysis) return;

    const data = {
      reconstruction: input,
      analysis: {
        valid: analysis.valid,
        moveCount: analysis.moveCount,
        htm: analysis.htm,
        stm: analysis.stm,
        moves: analysis.moves,
        errors: analysis.errors,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconstruction-${Date.now()}.json`;
    a.click();
  }
</script>

<Card title="Export Analysis">
  <p class="text-sm text-gray-600 mb-4">
    Export the reconstruction analysis as JSON for later review
  </p>
  <Button onclick={exportAnalysis} disabled={!analysis} class="w-full">Download Analysis</Button>
</Card>
