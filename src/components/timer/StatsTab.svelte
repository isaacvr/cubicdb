<script lang="ts">
  import Chart, { type Plugin } from 'chart.js/auto';
  import zoomPlugin from 'chartjs-plugin-zoom';
  import { between, evalLine, map, rotatePoint, rotateSegment, search } from '@helpers/math';
  import { decimate, decimateN, getAverageS, trendLSV } from '@helpers/statistics';
  import { infinitePenalty, timer } from '@helpers/timer';
  import { AverageSetting, Penalty, type Solve, type TimerContext } from '@interfaces';
  import { onMount } from 'svelte';
  import StatsProgress from './StatsProgress.svelte';
  import moment from 'moment';

  export let context: TimerContext;

  let { solves, AoX, stats, session } = context;

  let chartElement: HTMLCanvasElement;
  let chartElement1: HTMLCanvasElement;
  let chartElement2: HTMLCanvasElement;
  let chartElement3: HTMLCanvasElement;
  let chartElement4: HTMLCanvasElement;
  let timeChart: Chart;
  let penaltyChart: Chart;
  let hourChart: Chart;
  let weekChart: Chart;
  let distChart: Chart;

  const DAYS = [ "Sun", "Mon", "Tue", "Wen", "Thu", "Fri", "Sat" ];

  function getBest(arr: Solve[], rev?: boolean): {x: number; y: number}[] {
    let best = Infinity;
    let bests = [];
    let len = arr.length - 1;
    
    let idx = (i: number) => rev ? len - i : i;

    for (let i = 0, maxi = len + 1; i < maxi; i += 1) {
      if ( arr[ idx(i) ].penalty === Penalty.DNF ) {
        continue;
      }
      if ( arr[ idx(i) ].time < best ) {
        best = arr[ idx(i) ].time;
        bests.push({ x: i, y: best });
      }
    }

    return bests;
  }

  function updateChart(sv: Solve[]) {
    // TIME CHART
    const WIDTH = timeChart.width;

    let newSv = decimate(sv, WIDTH);
    const len0 = sv.length - 1;
    const len = newSv.length - 1;
    const lenFactor = len0 / (len || 1);

    timeChart.data.labels = newSv.map((e, p) => p);

    /// Regular solves
    timeChart.data.datasets[0].data.length = 0;

    newSv.forEach((e, p) => {
      timeChart.data.datasets[0].data.push({
        x: p * lenFactor,
        y: infinitePenalty(newSv[len - p]) ? null : newSv[len - p].time
      });
    });

    timeChart.options.plugins.zoom.limits.x.max = len + 1;
    
    let avgs = [ 5, 12, 50, $AoX ];

    /// Ao5 to AoX
    avgs.forEach((e, i) => {
      let dt = timeChart.data.datasets[i + 1];
      dt.data.length = 0;
      let Ao = getAverageS(e, sv, $session?.settings?.calcAoX || AverageSetting.SEQUENTIAL);
      decimateN(Ao, WIDTH).map((e, p) => dt.data.push({ x: p * lenFactor, y: e }));
      dt.label = 'Ao' + e;
    });
    
    /// Best solves
    timeChart.data.datasets[5].data.length = 0;
    getBest(sv, true).forEach(e => timeChart.data.datasets[5].data.push(e));

    // Least square
    const { m, n } = trendLSV(newSv.map((s, p) => [len - p, s.time]));
    timeChart.data.datasets[6].data.length = 0;
    [{ x: 0, y: n }, { x: len * lenFactor, y: m * len + n }].forEach(e => timeChart.data.datasets[6].data.push(e));

    timeChart.update();
    timeChart.resetZoom();

    // HOUR CHART
    let HData = sv.reduce((acc, s) => {
      acc[ moment(s.date).hour() ] += 1;
      return acc;
    }, new Array(24).fill(0));

    hourChart.data.datasets[0].data = HData.map((e, p) => ({x: p, y: e}));
    hourChart.update();

    // WEEK CHART
    let WData: number[] = sv.reduce((acc, s) => {
      acc[ moment(s.date).isoWeekday() ] += 1;
      return acc;
    }, new Array(7).fill(0));

    weekChart.data.datasets[0].data = WData; //.map((e, p) => [DAYS[p], e.toString()]);
    weekChart.update();
  }

  function updateStats() {
    // PENALTY CHART
    penaltyChart.data.datasets[0].data = [
      $stats.NP.value, $stats.P2.value, $stats.DNF.value
    ];

    penaltyChart.update();

    // HISTOGRAM
    let minT = $stats.best.value;
    let maxT = $stats.worst.value + 1e-5;
    let splits = between($solves.length, 1, 10);
    let f = (x) => minT + (maxT - minT) * x / splits;

    let itvs = new Array(splits).fill(0).map((_, p) => [ f(p), f(p + 1) ]);
    let cants = $solves.reduce((acc, s) => {
      if ( !infinitePenalty(s) ) {
        acc[ Math.floor((s.time - minT) * splits / (maxT - minT)) ] += 1;
      }
      return acc;
    }, new Array(splits).fill(0));

    distChart.data.datasets[0].data = cants;
    distChart.data.labels = itvs.map(a => `${ timer(a[0], true) } - ${ timer(a[1], true) }`);

    distChart.update();
  }

  onMount(() => {
    const common = {
      showLine: true,
      fill: false,
      tension: .1,
      xAxisID: 'x',
      yAxisID: 'y',
    };

    const fastOptions = {
      normalized: true,
    };

    let ctx = chartElement.getContext('2d');
    
    Chart.register(zoomPlugin);
    Chart.defaults.color = '#bbbbbb';

    const shadingArea: Plugin = {
      id: 'shadingArea',
      beforeDatasetsDraw(ch) {
        const { ctx, scales: {y} } = ch;
        const { data, hidden } = ch.getDatasetMeta(6);

        if ( data.length < 2 || hidden ) {
          return;
        }
        
        // Data coordinates
        let pd1 = [data[0].x, data[0].y];
        let pd2 = [data[1].x, data[1].y];
        let dev = y.height * $stats.dev.value / (y.max - y.min);
        let rv = rotatePoint(pd2[0] - pd1[0], pd2[1] - pd1[1], Math.PI / 2);
        let norm = Math.sqrt( rv[0] ** 2 + rv[1] ** 2 );
        rv = rv.map(e => e * dev / norm);

        // Rectangle in data coordinates
        let p1 = evalLine(pd1[0], pd1[0] + rv[0], pd1[1] + rv[1], pd2[0] + rv[0], pd2[1] + rv[1]);
        let p2 = evalLine(pd2[0], pd1[0] + rv[0], pd1[1] + rv[1], pd2[0] + rv[0], pd2[1] + rv[1]);
        let p3 = evalLine(pd2[0], pd1[0] - rv[0], pd1[1] - rv[1], pd2[0] - rv[0], pd2[1] - rv[1]);
        let p4 = evalLine(pd1[0], pd1[0] - rv[0], pd1[1] - rv[1], pd2[0] - rv[0], pd2[1] - rv[1]);

        // Rectangle in graphic coordinates
        let pg1 = [ pd1[0], p1 ];
        let pg2 = [ pd2[0], p2 ];
        let pg3 = [ pd2[0], p3 ];
        let pg4 = [ pd1[0], p4 ];

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, .1)';
        ctx.moveTo(pg1[0], pg1[1]);
        ctx.lineTo(pg2[0], pg2[1]);
        ctx.lineTo(pg3[0], pg3[1]);
        ctx.lineTo(pg4[0], pg4[1]);
        ctx.lineTo(pg1[0], pg1[1]);
        ctx.fill();
        ctx.restore();

      }
    };

    timeChart = new Chart(ctx, {
      data: {
        datasets: [
          { data: [], type: 'line', label: 'Time', ...common, ...fastOptions },
          { data: [], type: 'line', hidden: true, label: 'Ao5', ...common, ...fastOptions },
          { data: [], type: 'line', hidden: true, label: 'Ao12', ...common, ...fastOptions },
          { data: [], type: 'line', hidden: true, label: 'Ao50', ...common, ...fastOptions },
          { data: [], type: 'line', hidden: true, label: 'AoX', ...common, ...fastOptions },
          { data: [], type: 'line', label: 'Best', borderDash: [5, 5], ...common, ...fastOptions },
          { data: [], type: 'line', label: 'Trend', borderDash: [5, 5], ...common,  },
        ],
        labels: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        scales: {
          x:{
            type: 'linear',
            ticks: { display: false },
            grid: { display: false },
          },
          y: {
            position: 'left',
            grid: { color: '#555' },
            ticks: {
              callback: (value: number) => timer(value, false, true)
            }
          }
        },
        layout: { padding: { left: 10, right: 10 } },
        plugins: {
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label;
                let yLabel = context.parsed.y;
                return label + ": " + timer(+yLabel, false, true);
              },
              title: (items) => `Solve #${Math.round(items[0].parsed.x) + 1}`
            }
          },
          zoom: {
            zoom: { wheel: { enabled: true }, mode: 'x', scaleMode: "x" },
            pan: { enabled: true, mode: "x", },
            limits: { x: { min: 1, max: 40 } },
          },
          title: { text: "Time distribution", display: true, font: { size: 30, family: "Raleway" }, color: '#ddd' }
        }
      },
      plugins: [ shadingArea ],
    });

    let ctx1 = chartElement1.getContext('2d');

    penaltyChart = new Chart(ctx1, {
      type: "doughnut",
      data: { datasets: [{
        data: [3, 4, 5],
        backgroundColor: [ "rgb(74, 222, 128)", "rgb(251, 146, 60)", "rgb(248, 113, 113)" ],
        borderColor: 'transparent'
      }], labels: ["Clean", "+2", "DNF"] },
      options: { plugins: { legend: { display: false } } }
    });

    let ctx2 = chartElement2.getContext('2d');

    hourChart = new Chart(ctx2, {
      data: { datasets: [{ data: [], label: "Solves", type: 'scatter', ...common, tension: .4 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { text: "Hour distribution", display: true, font: { size: 30, family: "Raleway" }, color: '#ddd' }
        },
        scales: { x: { min: 0, max: 23 }, y: { beginAtZero: true } }
      }
    });

    let ctx3 = chartElement3.getContext('2d');

    weekChart = new Chart(ctx3, {
      data: {
        datasets: [{ data: [], label: "Solves", type: 'line', ...common, tension: .4 }],
        labels: DAYS,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { text: "Week distribution", display: true, font: {
            size: 30, family: "Raleway"
          }, color: '#ddd' }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
    
    let ctx4 = chartElement4.getContext('2d');

    distChart = new Chart(ctx4, {
      data: {
        datasets: [{ data: [1, 2, 3, 4, 5], label: "Solves", type: 'bar' }],
        labels: ["A", "B", "C", "D", "E"],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { text: "Histogram", display: true, font: {
            size: 30, family: "Raleway"
          }, color: '#ddd' }
        },
        scales: { y: { beginAtZero: true } }
      }
    });

    updateChart($solves);

  });

  $: $AoX && timeChart && updateChart($solves);
  $: $stats && penaltyChart && updateStats();

</script>

<svelte:window on:resize={ () => [timeChart, penaltyChart, hourChart, weekChart].forEach(c => c.resize()) } />

<main>
  <div class="canvas card grid place-items-center bg-white bg-opacity-10 rounded-md">
    <canvas bind:this={ chartElement }></canvas>
  </div>
  <div class="stats card">
    <StatsProgress
      title="Best" pColor="bg-green-400"
      label={ timer($stats.best.value, true, true) }
      value={ $stats.best.value } total={ $stats.worst.value }/>

    <StatsProgress
      title="Worst" pColor="bg-orange-400"
      label={ timer($stats.worst.value, true, true) }
      value={ $stats.worst.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title="Average"
      label={ timer($stats.avg.value, true, true) }
      value={ $stats.avg.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title="Standard Deviation"
      label={ timer($stats.dev.value, true, true) }
      value={ $stats.dev.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title="Total time" bgColor="hidden"
      label={ timer($stats.time.value, true, true) }/>
  </div>

  <div class="penalties card">
    <div class="w-full"> <canvas bind:this={ chartElement1 }></canvas> </div>
    <div class="w-full">
      <StatsProgress title="Count" label={ $stats.count.value.toString() }
        value={ $stats.count.value } total={ $stats.count.value }/>
      
      <StatsProgress title="Clean" pColor="bg-green-400" label={`${ $stats.NP.value }`}
        value={ $stats.NP.value } total={ $stats.count.value }/>
      
      <StatsProgress title="+2" pColor="bg-orange-400" label={ $stats.P2.value.toString() }
        value={ $stats.P2.value } total={ $stats.count.value }/>
      
      <StatsProgress title="DNF" pColor="bg-red-400" label={ $stats.DNF.value.toString() }
        value={ $stats.DNF.value } total={ $stats.count.value }/>
    </div>
  </div>

  <div class="hour-distribution card">
    <!-- <h2 class="text-2xl text-center font-bold text-gray-300">Hour distribution</h2> -->
    <canvas bind:this={ chartElement2 }></canvas>
  </div>

  <div class="week-distribution card">
    <!-- <h2 class="text-2xl text-center font-bold text-gray-300">Week distribution</h2> -->
    <canvas bind:this={ chartElement3 }></canvas>
  </div>

  <div class="histogram card">
    <!-- <h2 class="text-2xl text-center font-bold text-gray-300">Week distribution</h2> -->
    <canvas bind:this={ chartElement4 }></canvas>
  </div>
</main>

<style lang="postcss">
main {
  @apply w-full overflow-scroll p-4 grid gap-4 grid-rows-5 grid-cols-2 lg:grid-cols-3 lg:grid-rows-3;
  max-height: calc(100vh - 8rem);
  grid-template-rows: repeat(4, minmax(20rem, 1fr));
}

.card {
  @apply text-gray-300 p-6 bg-white bg-opacity-10 rounded-md;
}

.stats, .penalties {
  @apply flex flex-col items-center justify-between row-span-1;
}

.canvas {
  @apply col-span-2 row-span-2;
}

.penalties {
  @apply grid grid-cols-2 place-items-center gap-6;
}

.hour-distribution {
  @apply grid col-span-1 lg:col-span-2;
}

.week-distribution {
  @apply grid;
}

.histogram {
  @apply col-span-full;
}
</style>