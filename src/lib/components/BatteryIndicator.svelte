<script lang="ts">
  import { BatteryFullIcon, BatteryIcon, BatteryLowIcon, BatteryMediumIcon } from "lucide-svelte";

  let { percent, showPercent = false } = $props();
</script>

<span class="flex items-center gap-2">
  {#if percent < 25}
    <BatteryIcon size="1.2rem" />
  {:else if percent < 50}
    <BatteryLowIcon size="1.2rem" />
  {:else if percent < 75}
    <BatteryMediumIcon size="1.2rem" />
  {:else}
    <BatteryFullIcon size="1.2rem" />
  {/if}

  {#if showPercent}
    {percent}%
  {/if}
</span>
