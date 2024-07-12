<script lang="ts">
  import Katex from "@components/Katex.svelte";
  import { timer, sTimer, infinitePenalty } from "@helpers/timer";
  import { type TimerContext, type Solve, AverageSetting } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { Button, Modal, Popover } from "flowbite-svelte";
  import { getAverageS } from "@helpers/statistics";
  import { copyToClipboard } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import moment from "moment";

  export let context: TimerContext;

  const { isRunning, stats, solves } = context;

  const notification = NotificationService.getInstance();

  let textSummary = "";
  let showModal = false;

  function summary(n: number) {
    let sv = $solves.slice(0, n).reverse();
    let minTime = (a: Solve, b: Solve) => {
      if (infinitePenalty(a)) return b;
      if (infinitePenalty(b)) return a;
      return a.time < b.time ? a : b;
    };

    let minMax = sv.reduce(
      (acc, s) => [minTime(acc[0], s) === s ? s : acc[0], minTime(acc[1], s) === s ? acc[1] : s],
      [sv[0], sv[0]]
    );

    let avg = getAverageS(n, sv, AverageSetting.SEQUENTIAL)[n - 1];

    textSummary = `${$localLang.global.generatedByCubeDB} - ${moment().format("DD/MM/YYYY hh:mma")}
    ${n === 3 ? "M" : "A"}o${n}: ${avg ? timer(avg, true, true) : "DNF"}
    
    ${sv
      .map(
        (s, p) =>
          `${p + 1}. ${
            s === minMax[0] || s === minMax[1]
              ? "(" + sTimer(s, true, true) + ")"
              : sTimer(s, true, true)
          } - ${s.scramble}`
      )
      .join("\n\n")}`
      .split("\n")
      .map(s => s.trimStart())
      .join("\n");
    showModal = true;
  }

  function toClipboard(text: string) {
    copyToClipboard(text.replaceAll("<br>", "\n")).then(() => {
      notification.addNotification({
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000,
      });
    });
  }
</script>

<!-- Left Statistics -->
<div
  id="left-stats"
  class="text-gray-300 transition-all duration-300 max-md:text-xs"
  class:hide={$isRunning}
>
  <table class="ml-3">
    <!-- Best -->
    <tr class:better={$stats.best.better && $stats.counter.value > 0 && $stats.best.value > -1}>
      <td>{$localLang.TIMER.best}:</td>
      {#if !$stats.best.value}
        <td>N/A</td>
      {/if}
      {#if $stats.best.value}
        <td>{timer($stats.best.value, true, true)}</td>
      {/if}
    </tr>

    <!-- Worst -->
    <tr>
      <td>{$localLang.TIMER.worst}:</td>
      {#if !$stats.worst.value}
        <td>N/A</td>
      {/if}
      {#if $stats.worst.value}
        <td>{timer($stats.worst.value, true, true)}</td>
      {/if}
    </tr>

    <!-- Average -->
    <tr class:better={$stats.avg.better && $stats.counter.value > 0}>
      <td>
        <span class="stat-info">{$localLang.TIMER.average}:</span>
        <Popover title={$localLang.TIMER.average} class="max-w-sm z-10">
          <p>{$localLang.TIMER.stats.average}</p>

          <span class="my-2 mx-auto w-fit flex text-gray-200 text-xl">
            <Katex math={`\\mu = \\frac{\\sum_{i=1}^{N} x_i}{N}`} />
          </span>
        </Popover>
      </td>

      {#if !$stats.avg.value}
        <td>N/A</td>
      {/if}
      {#if $stats.avg.value}
        <td>{timer($stats.avg.value, true, true)}</td>
      {/if}
    </tr>

    <!-- stdDev -->
    <tr>
      <td>
        <span class="stat-info">{$localLang.TIMER.deviation}:</span>
        <Popover title={$localLang.TIMER.deviation} class="max-w-sm z-10">
          <p>{$localLang.TIMER.stats.deviation}</p>

          <span class="my-2 mx-auto w-fit flex text-gray-200 text-xl">
            <Katex math={`\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2}`} />
          </span>
        </Popover>
      </td>
      {#if !$stats.dev.value}
        <td>N/A</td>
      {/if}
      {#if $stats.dev.value}
        <td>{timer($stats.dev.value, true, true)}</td>
      {/if}
    </tr>

    <!-- Count -->
    <tr>
      <td>{$localLang.TIMER.count}:</td>
      <td>{$stats.count.value}</td>
    </tr>

    <!-- Mo3 -->
    <tr class:better={$stats.Mo3.better && $stats.counter.value > 0 && $stats.Mo3.value > -1}>
      <td>
        <span class="stat-info">Mo3:</span>
        <Popover title="Mo3" class="max-w-sm z-10">
          <p>{$localLang.TIMER.stats.mo3}</p>

          <span class="my-2 mx-auto w-fit flex text-gray-200 text-xl">
            <Katex math={`Mo3 = \\frac{x_1 + x_2 + x_3}{3}`} />
          </span>
        </Popover>
      </td>

      <td class="cursor-pointer hover:text-green-300" on:click={() => summary(3)}>
        {#if $stats.Mo3.value > -1}
          {timer($stats.Mo3.value, true, true)}
        {:else}
          N/A
        {/if}
      </td>
    </tr>

    <!-- Ao5 -->
    <tr class:better={$stats.Ao5.better && $stats.counter.value > 0 && $stats.Ao5.value > -1}>
      <td>
        <span class="stat-info">Ao5:</span>
        <Popover title="Ao5" class="max-w-sm z-10">
          <p>{$localLang.TIMER.stats.ao5}</p>

          <span class="my-2 mx-auto w-fit flex text-gray-200 text-xl">
            <Katex math={`Ao5 = \\frac{(\\sum_{i=1}^{5} x_i) - max - min}{3}`} />
          </span>
        </Popover>
      </td>

      <td class="cursor-pointer hover:text-green-300" on:click={() => summary(5)}>
        {#if $stats.Ao5.value > -1}
          {timer($stats.Ao5.value, true, true)}
        {:else}
          N/A
        {/if}
      </td>
    </tr>
  </table>
</div>

<!-- Right Statistics -->
<div
  id="right-stats"
  class="text-gray-300 transition-all duration-300 max-md:text-xs"
  class:hide={$isRunning}
>
  <table class="mr-3">
    {#each ["Ao12", "Ao50", "Ao100", "Ao200", "Ao500", "Ao1k", "Ao2k"] as stat, pos}
      <tr class:better={$stats[stat].better && $stats.counter.value > 0 && $stats[stat].value > -1}>
        <td>{stat}:</td>

        <td
          class={pos < 2 ? "cursor-pointer hover:text-green-300" : ""}
          on:click={() => (pos < 2 ? summary([12, 50][pos]) : null)}
        >
          {#if $stats[stat].value > -1}
            {timer($stats[stat].value, true, true)}
          {:else}
            N/A
          {/if}
        </td>
      </tr>
    {/each}
  </table>
</div>

<Modal bind:open={showModal} outsideclose title={$localLang.global.summary}>
  <pre
    class="w-full text-xs whitespace-pre-wrap text-gray-300 max-h-[60vh] overflow-auto">{textSummary}</pre>

  <svelte:fragment slot="footer">
    <div class="flex justify-center gap-4 w-full">
      <Button color="alternative" on:click={() => toClipboard(textSummary)}
        >{$localLang.global.clickToCopy}</Button
      >
      <Button color="purple" on:click={() => (showModal = false)}>{$localLang.global.accept}</Button
      >
    </div>
  </svelte:fragment>
</Modal>

<style lang="postcss">
  td:not(.cursor-pointer) {
    cursor: default;
  }

  #left-stats {
    grid-area: leftStats;
  }

  #right-stats {
    grid-area: rightStats;
  }

  #left-stats tr.better,
  #right-stats tr.better {
    text-decoration: underline;
    font-weight: bold;
  }

  .hide {
    @apply transition-all duration-200 pointer-events-none opacity-0;
  }

  .stat-info {
    @apply text-yellow-100 cursor-help;
  }
</style>
