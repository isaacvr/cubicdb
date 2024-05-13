<script lang="ts">
  import { sum, toInt } from "@helpers/math";
  import { sTimer, timer } from "@helpers/timer";
  import type { Writable } from "svelte/store";
  import type { Solve, ReconstructorStep } from "@interfaces";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { algorithmToPuzzle } from "@helpers/object";
  import { Badge, TabItem, Tabs } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import { Puzzle } from "@classes/puzzle/puzzle";

  export let lastSolve: Writable<Solve | null>;
  export let reconstructor: ReconstructorStep[];

  let images: string[] = reconstructor.map(() => '');

  $: pGenerateCubeBundle(
    reconstructor.map((r) =>
      r.case ? algorithmToPuzzle(r.case, false) : new Puzzle({ type: "rubik" }),
    ),
    500,
  ).then((res) => images = res);
</script>

<Tabs defaultClass="flex !mt-0" contentClass="p-4 dark:bg-gray-800 !mt-0">
  <TabItem title={$localLang.global.summary} open>
    <ul class="flex justify-center gap-4 mb-8">
      <Badge large color="blue" class="!text-gray-300"
        >Time: {sTimer($lastSolve, true, true)}</Badge
      >
      <Badge large color="green" class="!text-gray-300"
        >Moves: {sum(reconstructor.map((r) => r.moves))}</Badge
      >
      <Badge large color="yellow" class="!text-gray-300"
        >TPS: {(
          (sum(reconstructor.map((r) => r.moves)) * 1000) /
          ($lastSolve?.time || 1)
        ).toFixed(2)}</Badge
      >
    </ul>

    <div class="grid items-center" style={"grid-template-columns: auto 1fr;"}>
      {#each reconstructor as rec}
        <span class="mx-2 px-2 text-gray-300 text-xl">
          {rec.name}
          {rec.case ? `(${rec.case.name})` : ""}
        </span>

        {#if !rec.skip}
          <div class="flex justify-evenly items-center w-full gap-2">
            <ul class="gap-2 flex flex-wrap">
              <Badge large color="blue" class="!text-gray-300">
                Time: {timer(rec.time, true, true)}
              </Badge>
              <Badge large color="green" class="!text-gray-300">
                Moves: {rec.moves}
              </Badge>
              <Badge large color="yellow" class="!text-gray-300">
                TPS: {((rec.moves * 1000) / toInt(rec.time, 1)).toFixed(2)}
              </Badge>
              <Badge large color="purple" class="!text-gray-300">
                Percent: {rec.percent}%
              </Badge>
            </ul>
          </div>
        {:else}
          <Badge large color="blue" class="!text-gray-300">Skip</Badge>
        {/if}
      {/each}
    </div>
  </TabItem>

  {#each reconstructor as rec, pos}
    <TabItem title={rec.name}>
      {#if rec.case}
        <div class="text-center">
          <img
            src={images[pos]}
            alt=""
            class="puzzle-img scale-75 object-contain m-auto"
          />
        </div>
      {/if}
    </TabItem>
  {/each}
</Tabs>
