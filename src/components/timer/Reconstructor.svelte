<script lang="ts">
  import { sum } from "@helpers/math";
  import { sTimer, sTime, timer } from "@helpers/timer";
  import type { Writable } from "svelte/store";
  import type { Solve } from "@interfaces";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { algorithmToPuzzle } from "@helpers/object";
  import {
    Badge,
    Progressbar,
    TabItem,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Tabs,
  } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import type { ReconstructorStep } from "@classes/reconstructors/interfaces";
  import TextArea from "@components/material/TextArea.svelte";
  import { parseReconstruction } from "@helpers/strings";

  export let lastSolve: Writable<Solve | null>;
  export let reconstructor: ReconstructorStep[];

  let images: string[] = reconstructor.map(() => "");

  function calcTPS(moves: number, time: number): string {
    return ((moves * 1000) / (time || 1)).toFixed(2);
  }

  function getMoves(rec: ReconstructorStep): string {
    if (rec.substeps.length === 0) return rec.moves.join(" ");
    return rec.substeps.map(s => s.moves.join(" ")).join(" ");
  }

  function updateImages(rec: ReconstructorStep[]) {
    let algs = rec.map(r =>
      r.case ? algorithmToPuzzle(r.case, !!r.addZ2) : new Puzzle({ type: "rubik" })
    );

    pGenerateCubeBundle(algs, 500).then(res => {
      images = res;
    });
  }

  $: updateImages(reconstructor);
</script>

<Tabs defaultClass="flex !mt-0" contentClass="p-4 dark:bg-gray-800 !mt-0">
  <TabItem title={$localLang.global.summary} open>
    <ul class="flex justify-center gap-4 mb-8">
      <Badge large color="blue" class="!text-gray-300">
        Time: {sTimer($lastSolve, true, true)}
      </Badge>
      <Badge large color="green" class="!text-gray-300">
        Moves: {sum(reconstructor.map(r => r.moveCount))}
      </Badge>
      <Badge large color="yellow" class="!text-gray-300">
        TPS: {calcTPS(sum(reconstructor.map(r => r.moveCount)), sTime($lastSolve) || 1)}
      </Badge>
    </ul>

    <Table shadow hoverable>
      <TableHead theadClass="!bg-primary-900 !text-white text-lg">
        <TableHeadCell>{$localLang.global.step}</TableHeadCell>
        <TableHeadCell>{$localLang.global.time}</TableHeadCell>
        <TableHeadCell>{$localLang.global.moves}</TableHeadCell>
        <TableHeadCell>TPS</TableHeadCell>
        <TableHeadCell>%</TableHeadCell>
      </TableHead>

      <TableBody>
        {#each reconstructor as rec}
          <TableBodyRow>
            <TableBodyCell>{rec.name}</TableBodyCell>

            {#if rec.skip}
              <TableBodyCell>-</TableBodyCell>
              <TableBodyCell>-</TableBodyCell>
              <TableBodyCell>-</TableBodyCell>
              <TableBodyCell>-</TableBodyCell>
            {:else}
              <TableBodyCell>{timer(rec.time, true, true)}</TableBodyCell>
              <TableBodyCell>{rec.moveCount}</TableBodyCell>
              <TableBodyCell>{calcTPS(rec.moveCount, rec.time)}</TableBodyCell>
              <TableBodyCell>
                {rec.percent}%
                <Progressbar color="yellow" size="h-1" progress={rec.percent} />
              </TableBodyCell>
            {/if}
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </TabItem>

  {#each reconstructor as rec, pos}
    <TabItem title={rec.name}>
      <ul class="flex justify-center gap-4 mb-8">
        <Badge large color="blue" class="!text-gray-300">
          Time: {sTimer($lastSolve, true, true)}
        </Badge>
        <Badge large color="green" class="!text-gray-300">
          Moves: {rec.moveCount}
        </Badge>
        <Badge large color="yellow" class="!text-gray-300">
          TPS: {calcTPS(rec.moveCount, rec.time || 1)}
        </Badge>
      </ul>

      {#if rec.case}
        <div class="text-center">
          <img src={images[pos]} alt="" class="puzzle-img scale-75 object-contain m-auto" />
        </div>
      {/if}

      {#if rec.substeps.length > 0}
        <Table shadow hoverable>
          <TableHead theadClass="!bg-primary-900 !text-white text-lg">
            <TableHeadCell>{$localLang.global.step}</TableHeadCell>
            <TableHeadCell>{$localLang.global.time}</TableHeadCell>
            <TableHeadCell>{$localLang.global.moves}</TableHeadCell>
            <TableHeadCell>TPS</TableHeadCell>
            <TableHeadCell>%</TableHeadCell>
          </TableHead>

          <TableBody>
            {#each rec.substeps as rec1}
              <TableBodyRow>
                <TableBodyCell>{rec1.name}</TableBodyCell>

                {#if rec1.skip}
                  <TableBodyCell>-</TableBodyCell>
                  <TableBodyCell>-</TableBodyCell>
                  <TableBodyCell>-</TableBodyCell>
                  <TableBodyCell>-</TableBodyCell>
                {:else}
                  <TableBodyCell>{timer(rec1.time, true, true)}</TableBodyCell>
                  <TableBodyCell>{rec1.moveCount}</TableBodyCell>
                  <TableBodyCell>{calcTPS(rec1.moveCount, rec1.time)}</TableBodyCell>
                  <TableBodyCell>
                    {rec1.percent}%
                    <Progressbar color="yellow" size="h-1" progress={rec1.percent} />
                  </TableBodyCell>
                {/if}
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}

      {#if rec.moveCount}
        <TextArea
          cClass="border border-gray-600 rounded-md mt-6"
          placeholder={$localLang.global.moves}
          value={getMoves(rec)}
          readOnly
          getInnerText={s => parseReconstruction(s, "rubik", 3).result}
        />
      {/if}
    </TabItem>
  {/each}
</Tabs>
