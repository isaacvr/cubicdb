<script lang="ts">
  import type { SessionType } from "@interfaces";
  import StepIcon from "@icons/ShoePrint.svelte";
  import MixedIcon from "@icons/CubeScan.svelte";
  import SingleIcon from "@icons/CubeOutline.svelte";

  export let icon: SessionType = "mixed";
</script>

{#if icon === "mixed"}
  <MixedIcon size="1.2rem" class="text-purple-300 shrink-0" />
{:else if icon === "single"}
  <SingleIcon size="1.2rem" class="text-green-400 shrink-0" />
{:else if icon === "multi-step"}
  <StepIcon size="1.2rem" class="text-sky-400 shrink-0" />
{/if}
