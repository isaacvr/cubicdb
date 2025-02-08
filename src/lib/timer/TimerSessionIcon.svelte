<script lang="ts">
  import type { SessionType } from "@interfaces";
  import { BlendIcon, BoxIcon, FootprintsIcon } from "lucide-svelte";

  interface TimerSessionIconProps {
    icon?: SessionType;
    size?: string;
  }

  let { icon = $bindable("single"), size = $bindable("1.2rem") }: TimerSessionIconProps = $props();
</script>

{#if icon === "mixed"}
  <BlendIcon {size} class="text-purple-300 shrink-0" />
{:else if icon === "single"}
  <BoxIcon {size} class="text-green-400 shrink-0" />
{:else if icon === "multi-step"}
  <FootprintsIcon {size} class="text-sky-400 shrink-0" />
{/if}
