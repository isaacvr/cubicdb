<script lang="ts">
  import type { SessionType } from "@interfaces";
  import StepIcon from "@icons/ShoePrint.svelte";
  import MixedIcon from "@icons/CubeScan.svelte";
  import SingleIcon from "@icons/CubeOutline.svelte";

  interface TimerSessionIconProps {
    icon?: SessionType;
    size?: string;
  }

  let { icon = $bindable("single"), size = $bindable("1.2rem") }: TimerSessionIconProps = $props();
</script>

{#if icon === "mixed"}
  <MixedIcon {size} class="text-purple-300 shrink-0" />
{:else if icon === "single"}
  <SingleIcon {size} class="text-green-400 shrink-0" />
{:else if icon === "multi-step"}
  <StepIcon {size} class="text-sky-400 shrink-0" />
{/if}
