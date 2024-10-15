<script lang="ts">
  import type { Game, ROUND } from "@interfaces";
  import {
    Accordion,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import { isMo3, timer } from "@helpers/timer";
  import Award from "@components/Award.svelte";

  // export let roundGroup: ROUND[][][] = [];
  export let game: Game;

  const rndKeys = ["t1", "t2", "t3", "t4", "t5"] as const;
  const TABLE_HEAD_CLASS = "px-2 text-center bg-gray-900";
  const TABLE_CELL_CLASS =
    "px-2 text-center [&:not(:first-child)]:border-l [&:not(:first-child)]:border-l-gray-600";

  let completed = false;

  function isPos(round: ROUND, i: number, pos: number) {
    let vals = [round.t1, round.t2, round.t3, round.t4, round.t5].map((s, p) => [s.time, p]);
    vals.sort((a, b) => (a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]));
    return vals[pos][1] === i;
  }

  $: completed = game.players.every(p =>
    p[1].times.slice(0, isMo3(game.mode) ? 3 : 5).every(t => t != 0)
  );
</script>

<Accordion class="w-full">
  <Table hoverable shadow divClass="w-full relative overflow-x-auto">
    <TableHead>
      <TableHeadCell class={TABLE_HEAD_CLASS}>No.</TableHeadCell>
      <TableHeadCell class={TABLE_HEAD_CLASS}>Nombre</TableHeadCell>
      <TableHeadCell class={TABLE_HEAD_CLASS}>T1</TableHeadCell>
      <TableHeadCell class={TABLE_HEAD_CLASS}>T2</TableHeadCell>
      <TableHeadCell class={TABLE_HEAD_CLASS}>T3</TableHeadCell>

      {#if ["666wca", "777wca"].indexOf(game.mode) > -1}
        {#if completed}
          <TableHeadCell class={TABLE_HEAD_CLASS}>Mo3</TableHeadCell>
        {/if}
      {:else}
        <TableHeadCell class={TABLE_HEAD_CLASS}>T4</TableHeadCell>
        <TableHeadCell class={TABLE_HEAD_CLASS}>T5</TableHeadCell>

        {#if completed}
          <TableHeadCell class={TABLE_HEAD_CLASS + " dark:text-primary-400"}>Ao5</TableHeadCell>
        {/if}
      {/if}
    </TableHead>

    <TableBody>
      {#each game.players as player, p}
        {@const best = player[1].times[6]}
        {@const worst = player[1].times[7]}

        <TableBodyRow class="!bg-white !bg-opacity-5 !border-t-gray-600">
          <TableBodyCell class={TABLE_CELL_CLASS}>
            {#if p === 0 && completed}
              <Award type="gold" />
            {:else if p === 1 && completed}
              <Award type="silver" />
            {:else if p === 2 && completed}
              <Award type="bronze" />
            {:else}
              <span class="flex justify-center">{p + 1}</span>
            {/if}
          </TableBodyCell>

          <TableBodyCell class={TABLE_CELL_CLASS}>{player[1].name}</TableBodyCell>

          {#each rndKeys as tp, p}
            {@const time = player[1].times[p]}

            {#if p < 3 || !isMo3(game.mode)}
              <TableBodyCell class={TABLE_CELL_CLASS}>
                <span
                  class="flex justify-center"
                  class:best={completed && +time === best}
                  class:worst={completed && +time === worst}
                >
                  {time === 0 ? "-" : timer(time, true)}
                </span>
              </TableBodyCell>
            {/if}
          {/each}

          {#if completed}
            <TableBodyCell class={TABLE_CELL_CLASS}>
              <span class="flex justify-center dark:text-primary-400 text-primary-600">
                {timer(player[1].times[5], true)}
              </span>
            </TableBodyCell>
          {/if}
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
</Accordion>

<style lang="postcss">
  .best {
    @apply text-green-500;
  }

  .worst {
    @apply text-red-500;
  }
</style>
