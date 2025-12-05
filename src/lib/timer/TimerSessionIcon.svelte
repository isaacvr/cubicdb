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
  <BlendIcon {size} class="inline text-purple-300 shrink-0" />
{:else if icon === "single"}
  <BoxIcon {size} class="inline text-green-400 shrink-0" />
{:else if icon === "multi-step"}
  <FootprintsIcon {size} class="inline text-sky-400 shrink-0" />
{/if}
