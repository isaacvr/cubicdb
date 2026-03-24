<script lang="ts">
  import { Button, Card } from "@lib/cubicdbKit";
  import type { ReconstructionAnalysis } from "./ReconstructionTypes";

  interface Props {
    input: string;
    analysis: ReconstructionAnalysis | null;
    onInputChange: (value: string) => void;
    onParse: () => void;
  }

  let { input, analysis, onInputChange, onParse }: Props = $props();
</script>

<Card title="Load Reconstruction">
  <div class="space-y-4">
    <textarea
      class="textarea textarea-bordered w-full h-32"
      placeholder="Enter scramble/reconstruction sequence (e.g., R U R' U' R U R' U')"
      value={input}
      oninput={(e: Event) => onInputChange((e.target as HTMLTextAreaElement).value)}
    />

    <div class="alert alert-info">
      <p class="text-sm">
        <strong>Tip:</strong> Enter moves separated by spaces. Supported: R,L,U,D,F,B, rotations (x,y,z),
        slices (M,E,S), and modifiers (', 2, w)
      </p>
    </div>

    <Button onclick={onParse} class="w-full">Parse Reconstruction</Button>

    {#if analysis}
      <div class="divider">Parsing Results</div>

      {#if !analysis.valid}
        <div class="alert alert-error">
          <p class="font-bold">Invalid Reconstruction</p>
          <ul class="list-disc pl-5 mt-2">
            {#each analysis.errors as error}
              <li class="text-sm">{error}</li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="alert alert-success">
          <p class="font-bold">Valid Reconstruction</p>
        </div>
      {/if}
    {/if}
  </div>
</Card>
