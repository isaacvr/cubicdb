<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import Select from "@components/material/Select.svelte";
  import { StepSolverStr, cubeOris, getSolver, type StepSolver } from "./solve-helper/allSolvers";

  export let context: TimerContext;

  let oris = cubeOris;
  let orientation = oris[0];

  let result: string[][] = [];
  let solver: StepSolver = "skewb";

  function updateResult(scr: string, sv: StepSolver, o: string) {
    result = getSolver(sv, scr, o);
  }

  const { scramble } = context;

  $: $scramble && updateResult($scramble, solver, orientation);
</script>

<div class="grid">
  <div class="flex flex-wrap gap-2 mb-4">
    <Select
      placement="right-start"
      class="!py-2 !bg-gray-800 !relative"
      bind:value={solver}
      items={StepSolverStr}
      transform={e => e.solver}
      label={e => e.name}
      useFixed={true}
    />

    {#if ["222", "pocket"].every(t => t != solver)}
      <Select
        placement="right-start"
        class="!py-2 !bg-gray-800 !relative"
        bind:value={orientation}
        items={oris}
        transform={e => e}
        label={e => e}
        useFixed={true}
      />
    {/if}
  </div>

  <div class="result">
    {#each result as row}
      {#each row as r, p}
        <span class={p === 0 ? "border-b border-b-gray-500" : ""}>{r}</span>
      {/each}
    {/each}
  </div>
</div>

<style>
  .result {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 1rem;
    row-gap: 0.5rem;
  }
</style>
