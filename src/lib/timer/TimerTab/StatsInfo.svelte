<script lang="ts">
  import Katex from "@components/Katex.svelte";
  import { timer } from "@helpers/timer";
  import { type TimerContext } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { Popover } from "flowbite-svelte";
  import { solveSummary } from "@helpers/statistics";
  import { copyToClipboard } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";

  interface StatsInfoProps {
    context: TimerContext;
  }

  let { context = $bindable() }: StatsInfoProps = $props();

  const { stats, solves, enableKeyboard } = context;
  const notification = NotificationService.getInstance();

  let textSummary = "";
  let showModal = false;

  const POPOVER_CLASS = "my-2 mx-auto bg-base-200 text-base-content";

  function saveEnableKeyboard() {
    localStorage.setItem("--stats-info-enableKeyboard", $enableKeyboard.toString());
    $enableKeyboard = false;
  }

  function recoverEnableKeyboard() {
    $enableKeyboard = localStorage.getItem("--stats-info-enableKeyboard") === "true";
  }

  function summary(n: number) {
    let sv = $solves.slice(0, n).reverse();
    textSummary = solveSummary(sv);
    showModal = true;
    saveEnableKeyboard();
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

<div class="stats-list w-full transition-all duration-300 max-md:text-xs">
  <!-- Best -->
  <div class:better={$stats.best.better && $stats.counter.value > 0 && $stats.best.value > -1}>
    <span>{$localLang.TIMER.best}:</span>
    {#if !$stats.best.value}
      <span>N/A</span>
    {/if}
    {#if $stats.best.value}
      <span>{timer($stats.best.value, true, true)}</span>
    {/if}
  </div>

  <!-- Worst -->
  <div>
    <span>{$localLang.TIMER.worst}:</span>
    {#if !$stats.worst.value}
      <span>N/A</span>
    {/if}
    {#if $stats.worst.value}
      <span>{timer($stats.worst.value, true, true)}</span>
    {/if}
  </div>

  <!-- Count -->
  <div>
    <span>{$localLang.TIMER.count}:</span>
    <span>{$stats.count.value}</span>
  </div>

  <!-- Average -->
  <div class:better={$stats.avg.better && $stats.counter.value > 0}>
    <span>
      <span class="stat-info">{$localLang.TIMER.average}:</span>
      <Popover class={POPOVER_CLASS}>
        <p>{$localLang.TIMER.stats.average}</p>

        <span class="my-2 mx-auto w-fit flex text-xl">
          <Katex math={`\\mu = \\frac{\\sum_{i=1}^{N} x_i}{N}`} />
        </span>
      </Popover>
    </span>

    {#if !$stats.avg.value}
      <span>N/A</span>
    {/if}
    {#if $stats.avg.value}
      <span>{timer($stats.avg.value, true, true)}</span>
    {/if}
  </div>

  <!-- stdDev -->
  <div>
    <span>
      <span class="stat-info">{$localLang.TIMER.deviation}:</span>
      <Popover class={POPOVER_CLASS}>
        <p>{$localLang.TIMER.stats.deviation}</p>

        <span class="my-2 mx-auto w-fit flex text-xl">
          <Katex math={`\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2}`} />
        </span>
      </Popover>
    </span>
    {#if !$stats.dev.value}
      <span>N/A</span>
    {/if}
    {#if $stats.dev.value}
      <span>{timer($stats.dev.value, true, true)}</span>
    {/if}
  </div>

  <!-- Mo3 -->
  <div class:better={$stats.Mo3.better && $stats.counter.value > 0 && $stats.Mo3.value > -1}>
    <span>
      <span class="stat-info">Mo3:</span>
      <Popover class={POPOVER_CLASS}>
        <p>{$localLang.TIMER.stats.mo3}</p>

        <span class="my-2 mx-auto w-fit flex text-xl">
          <Katex math={`Mo3 = \\frac{x_1 + x_2 + x_3}{3}`} />
        </span>
      </Popover>
    </span>

    <button class="cursor-pointer hover:text-primary" onclick={() => summary(3)}>
      {#if $stats.Mo3.value > -1}
        {timer($stats.Mo3.value, true, true)}
      {:else}
        N/A
      {/if}
    </button>
  </div>

  <!-- Ao5 -->
  <div class:better={$stats.Ao5.better && $stats.counter.value > 0 && $stats.Ao5.value > -1}>
    <span>
      <span class="stat-info">Ao5:</span>
      <Popover class={POPOVER_CLASS}>
        <p>{$localLang.TIMER.stats.ao5}</p>

        <span class="my-2 mx-auto w-fit flex text-xl">
          <Katex math={`Ao5 = \\frac{(\\sum_{i=1}^{5} x_i) - max - min}{3}`} />
        </span>
      </Popover>
    </span>

    <button class="cursor-pointer hover:text-primary" onclick={() => summary(5)}>
      {#if $stats.Ao5.value > -1}
        {timer($stats.Ao5.value, true, true)}
      {:else}
        N/A
      {/if}
    </button>
  </div>

  {#each [["Ao12", 12], ["Ao50", 50], ["Ao100", 100], ["Ao200", 200], ["Ao500", 500], ["Ao1k", 1000], ["Ao2k", 2000]] as stat, pos}
    {#if $stats.count.value >= Number(stat[1])}
      <div class:better={$stats[stat[0]].better && $stats.counter.value > 0}>
        <span>{stat[0]}:</span>

        <button
          class={pos < 2 ? "cursor-pointer hover:text-primary" : "pointer-events-none"}
          onclick={() => (pos < 2 ? summary([12, 50][pos]) : null)}
        >
          {timer($stats[stat[0]].value, true, true)}
        </button>
      </div>
    {/if}
  {/each}
</div>

<!-- <Modal
  bind:open={showModal}
  outsideclose
  title={$localLang.global.summary}
  on:close={recoverEnableKeyboard}
  class="max-w-2xl grid bg-backgroundLevel2 "
  color="none"
>
  <pre class="w-full text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto">{textSummary}</pre>

  <svelte:fragment slot="footer">
    <div class="flex justify-center gap-4 w-full">
      <Button color="alternative" class="bg-cancelButton " on:click={() => toClipboard(textSummary)}
        >{$localLang.global.clickToCopy}</Button
      >
      <Button color="none" class="bg-urgentButton " on:click={() => (showModal = false)}
        >{$localLang.global.accept}</Button
      >
    </div>
  </svelte:fragment>
</Modal> -->

<style lang="postcss">
  .better {
    text-decoration: underline;
    font-weight: bold;
  }

  .stats-list {
    @apply grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] px-2;
    gap: 0.5rem;
  }

  .stats-list > * {
    @apply flex justify-between bg-base-content bg-opacity-5 p-1 rounded-md;
  }
</style>
