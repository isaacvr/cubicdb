<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import Select from "@components/material/Select.svelte";
  import { StepSolverStr, cubeOris, getSolver, type StepSolver } from "./solve-helper/allSolvers";
  import { onMount } from "svelte";

  export let context: TimerContext;

  const { scramble, mode } = context;

  let oris = cubeOris;
  let orientation = oris[0];

  let result: string[][] = [];
  let solver: StepSolver | null = null;

  function autoSelect() {
    for (let i = 0, maxi = StepSolverStr.length; i < maxi; i += 1) {
      if (canWork(StepSolverStr[i], $mode[1])) {
        solver = StepSolverStr[i].solver;
        break;
      }
    }
  }

  function canWork(item: (typeof StepSolverStr)[number], md: string) {
    return item.modes.indexOf(md) > -1;
  }

  function updateResult(scr: string, sv: StepSolver | null, o: string, md: string) {
    if ( !sv ) return;

    let res = getSolver(sv, scr, o, md);

    if ( !res ) {
      autoSelect();
      result = [];
    } else {
      result = res;
    }
  }

  onMount(() => {
    autoSelect();
  });

  $: $scramble && updateResult($scramble, solver, orientation, $mode[1]);
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
      disabled={e => !canWork(e, $mode ? $mode[1] : "")}
    />

    {#if ["222", "pocket", "skewb", "sq1", "pyra"].every(t => t != solver)}
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
