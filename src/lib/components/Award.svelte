<script lang="ts">
  import { Tooltip } from "flowbite-svelte";
  import RecordIcon from "@icons/Trophy.svelte";
  import PlaceIcon from "@icons/Medal.svelte";

  type AwardType = "neutral" | "gold" | "silver" | "bronze" | "NR" | "ANR" | "PR" | "APR";

  export let type: AwardType = "neutral";
</script>

<div class="relative flex justify-center">
  {#if type === "neutral"}
    <RecordIcon class="text-purple-400 absolute -top-1 -right-1 translate-x-full" size=".8rem" />
  {:else if type === "gold"}
    <PlaceIcon class="text-yellow-300" size="1.2rem" />
    <Tooltip>Primer lugar</Tooltip>
  {:else if type === "silver"}
    <PlaceIcon class="text-zinc-200" size="1.1rem" />
    <Tooltip>Segundo lugar</Tooltip>
  {:else if type === "bronze"}
    <PlaceIcon class="text-orange-400" size="1rem" />
    <Tooltip>Tercer lugar</Tooltip>
  {:else if type === "NR"}
    <RecordIcon class="text-purple-400 absolute -top-1 -right-1 translate-x-full" size=".8rem" />
    <Tooltip>Récord Nacional</Tooltip>
  {:else if type === "PR"}
    <RecordIcon class="text-purple-400 absolute -top-1 -right-1 translate-x-full" size=".8rem" />
    <Tooltip>Récord Provincial</Tooltip>
  {/if}
</div>
