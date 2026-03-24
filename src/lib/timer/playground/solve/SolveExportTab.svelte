<script lang="ts">
  import type { Solve } from "@lib/interfaces";
  import { Button, Card } from "@lib/cubicdbKit";

  interface Props {
    solves: Solve[];
  }

  let { solves }: Props = $props();

  function exportSolves() {
    const data = JSON.stringify(solves, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solves-${Date.now()}.json`;
    a.click();
  }
</script>

<Card title="Export Solves">
  <p class="mb-4 text-sm text-gray-600">
    Export all solves as JSON for backup or analysis
  </p>
  <Button onclick={exportSolves} class="w-full">Download JSON</Button>
</Card>
