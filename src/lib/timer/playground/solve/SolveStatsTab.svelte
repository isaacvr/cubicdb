<script lang="ts">
  import type { Solve } from "@lib/interfaces";
  import { Penalty } from "@lib/interfaces";
  import { timer as formatTimer } from "@lib/helpers/timer";
  import { Card } from "@lib/cubicdbKit";

  interface Props {
    solves: Solve[];
  }

  let { solves }: Props = $props();

  let stats = $derived.by(() => {
    if (solves.length === 0) {
      return { best: null, worst: null, avg: null, mean: null, total: 0 };
    }

    const cleanSolves = solves.filter((s) => s.penalty !== Penalty.DNF);
    const times = cleanSolves.map((s) => s.time);

    if (cleanSolves.length === 0) {
      return { best: null, worst: null, avg: null, mean: null, total: solves.length };
    }

    const best = Math.min(...times);
    const worst = Math.max(...times);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;

    let avg = null;
    if (times.length >= 5) {
      const sorted = [...times].sort((a, b) => a - b);
      const middle = sorted.slice(1, -1);
      avg = middle.reduce((a, b) => a + b, 0) / middle.length;
    }

    return { best, worst, avg, mean, total: solves.length };
  });

  function penaltyPercent(penalty: Penalty): number {
    return (solves.filter((s) => s.penalty === penalty).length / Math.max(solves.length, 1)) * 100;
  }
</script>

<Card title="Statistics">
  <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
    <div class="stat">
      <div class="stat-title">Total Solves</div>
      <div class="stat-value text-3xl">{stats.total}</div>
    </div>

    {#if stats.best !== null}
      <div class="stat">
        <div class="stat-title">Best</div>
        <div class="stat-value text-2xl text-success">{formatTimer(stats.best, true)}</div>
      </div>
    {/if}

    {#if stats.worst !== null}
      <div class="stat">
        <div class="stat-title">Worst</div>
        <div class="stat-value text-2xl text-error">{formatTimer(stats.worst, true)}</div>
      </div>
    {/if}

    {#if stats.mean !== null}
      <div class="stat">
        <div class="stat-title">Mean</div>
        <div class="stat-value text-2xl">{formatTimer(stats.mean, true)}</div>
      </div>
    {/if}

    {#if stats.avg !== null}
      <div class="stat">
        <div class="stat-title">Ao5</div>
        <div class="stat-value text-2xl text-info">{formatTimer(stats.avg, true)}</div>
      </div>
    {/if}
  </div>
</Card>

<Card title="Penalty Distribution">
  <div class="space-y-2">
    {#each [
      { label: "Clean", penalty: Penalty.NONE, color: "bg-success" },
      { label: "+2", penalty: Penalty.P2, color: "bg-warning" },
      { label: "DNF", penalty: Penalty.DNF, color: "bg-error" },
    ] as item}
      <div>
        <p class="text-sm font-bold">{item.label}</p>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="{item.color} h-4 rounded-full" style="width: {penaltyPercent(item.penalty)}%" />
        </div>
      </div>
    {/each}
  </div>
</Card>
