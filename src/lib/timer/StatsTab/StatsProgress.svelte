<script lang="ts">
  import { Progressbar } from "flowbite-svelte";
  import { type IColor } from "@interfaces";

  export let title = "Title";
  export let label = "Label";
  export let pColor: IColor = "blue";
  export let value = 0;
  export let total = 0;
  export let size: string = "h-2";
  export let hidebar = false;

  let perc = 0;
  $: perc = total === 0 ? 0 : (value * 100) / total;
</script>

<div class="grid w-full gap-2">
  <div class="flex justify-between tx-text">
    <span class="text-left">{title}</span> <span class="ml-auto flex">{label}</span>
  </div>

  {#if !hidebar}
    <Progressbar progress={perc} {size} color={pColor} />
  {/if}
</div>
