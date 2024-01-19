<script lang="ts">
  import Chart, { type Plugin, Colors } from 'chart.js/auto';
  import zoomPlugin from 'chartjs-plugin-zoom';
  import { between, calcPercents, evalLine, rotatePoint } from '@helpers/math';
  import { getAverageS, trendLSV } from '@helpers/statistics';
  import { formatHour, infinitePenalty, timer } from '@helpers/timer';
  import { AverageSetting, Penalty, type Language, type Solve, type TimerContext, type Session } from '@interfaces';
  import { onMount } from 'svelte';
  import StatsProgress from './StatsProgress.svelte';
  import moment from 'moment';
  import { derived, type Readable } from 'svelte/store';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { AON, STEP_COLORS } from '@constants';
  import { screen } from '@stores/screen.store';
  import { Button } from 'flowbite-svelte';

  export let context: TimerContext;
  export let headless = false;

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));
    
  let { solves, stats, session, STATS_WINDOW, selectSolveById } = context;

  let chartElement: HTMLCanvasElement;
  let chartElement2: HTMLCanvasElement;
  let chartElement3: HTMLCanvasElement;
  let chartElement4: HTMLCanvasElement;
  let chartElement5: HTMLCanvasElement;
  let chartElement6: HTMLCanvasElement;
  let timeChart: Chart;
  let hourChart: Chart;
  let weekChart: Chart;
  let distChart: Chart;
  let stepTimeChart: Chart;
  let stepPercentChart: Chart;
  let steps: number[] = [];
  const BORDER_COLORS = [
    'rgb(54, 162, 235)',
    'rgb(255, 99, 132)',
    'rgb(255, 159, 64)',
    'rgb(255, 205, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)',
    'rgb(201, 203, 207)' // grey
  ];
  // Border colors with 50% transparency
  const BACKGROUND_COLORS = /* #__PURE__ */ BORDER_COLORS.map((color)=>color.replace('rgb(', 'rgba(').replace(')', ', 0.5)'));

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
    const len = sv.length - 1;

    timeChart.data.datasets[6].data = sv.map((e, p) => ({
      x: p,
      y: infinitePenalty(sv[len - p]) ? null : sv[len - p].time
    } as any));

    // @ts-ignore
    timeChart.options.plugins.zoom.limits.x.max = len;
    
    // @ts-ignore
    timeChart.options.scales.x.max = len;
    
    let avgs = [ 5, 12, 50, 100 ];

    /// Ao5 to AoX
    avgs.forEach((e, i) => {
      let dt = timeChart.data.datasets[5 - i];
      dt.data.length = 0;
      let pos = $AON.indexOf(e);
      let Ao = (pos > -1 && $STATS_WINDOW) ? $STATS_WINDOW[ pos ] : getAverageS(e, sv, $session?.settings?.calcAoX || AverageSetting.SEQUENTIAL);
      dt.data = Ao.map((e, p) => ({ x: p, y: e } as any));
      dt.label = 'Ao' + e;
    });
    
    /// Best solves
    timeChart.data.datasets[1].data = getBest(sv, true);

    // Least square
    if ( sv.filter(s => !infinitePenalty(s)).length > 2 ) {
      const { m, n } = trendLSV(sv.map((s, p) => [len - p, s.time]));
      timeChart.data.datasets[0].data = [{ x: 0, y: n }, { x: len, y: m * len + n }];
    } else {
      timeChart.data.datasets[0].data = [];
    }
    
    timeChart.update();
    timeChart.resetZoom();

    if ( headless ) return;

    // HOUR CHART
    let HData = sv.reduce((acc, s) => {
      acc[ moment(s.date).hour() ] += 1;
      return acc;
    }, new Array(24).fill(0));

    hourChart.data.datasets[0].data = HData.map((e, p) => ({x: p, y: e}));    
    hourChart.update();

    // WEEK CHART
    let WData: number[] = sv.reduce((acc, s) => {
      acc[ moment(s.date).isoWeekday() - 1 ] += 1;
      return acc;
    }, new Array(7).fill(0));

    weekChart.data.datasets[0].data = WData;
    weekChart.update();
  }

  function updateStats() {
    if ( headless ) return;

    // HISTOGRAM
    let minT = $stats.best.value;
    let maxT = $stats.worst.value + 1e-5;
    let splits = between($solves.length, 1, 10);
    let f = (x: number) => minT + (maxT - minT) * x / splits;

    let itvs = new Array(splits).fill(0).map((_, p) => [ f(p), f(p + 1) ]);
    let nonPenalty = 0;
    let cants = $solves.reduce((acc, s) => {
      if ( !infinitePenalty(s) ) {
        acc[ Math.floor((s.time - minT) * splits / (maxT - minT)) ] += 1;
        nonPenalty += 1;
      }
      return acc;
    }, new Array(splits).fill(0));

    distChart.data.datasets[0].data = cants;
    distChart.data.labels = itvs.map(a => `${ timer(a[0], true) } - ${ timer(a[1], true) }`);

    distChart.update();

    if ( !$session.settings || $session.settings.sessionType != 'multi-step' ) {
      return;
    }

    // Splits
    let sessionSteps = $session.settings.steps || 0;
    steps = (new Array(sessionSteps)).fill(0);

    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      if ( !infinitePenalty($solves[i]) ) {
        let st = $solves[i].steps || [];

        for (let j = 0; j < sessionSteps; j += 1) {
          steps[j] += (st[j] || 0);
        }
      }
    }

    steps = steps.map(e => nonPenalty ? e / nonPenalty : 0);

    if ( !stepTimeChart || !stepPercentChart ) {
      return;
    }

    stepTimeChart.data.datasets[0].data = steps;
    stepTimeChart.update();

    stepPercentChart.data.datasets[0].data = calcPercents(steps, $stats.avg.value);
    stepPercentChart.update();

  }

  function updateChartText() {
    $localLang.TIMER.timeChartLabels.forEach((l, p, a) => {
      timeChart.data.datasets[p].label = a[ a.length - p - 1];
    });

    if ( timeChart.options.plugins?.title ) {
      timeChart.options.plugins.title.text = $localLang.TIMER.timeDistribution;
    }

    timeChart.update();
   
    if ( headless ) return;
   
    // @ts-ignore
    hourChart.options.plugins.title.text = $localLang.TIMER.hourDistribution;
    hourChart.data.datasets[0].label = $localLang.TIMER.solves;
    hourChart.update();

    // @ts-ignore
    weekChart.options.plugins.title.text = $localLang.TIMER.weekDistribution;
    weekChart.data.datasets[0].label = $localLang.TIMER.solves;
    weekChart.data.labels = $localLang.TIMER.days;
    weekChart.update();

    // @ts-ignore
    distChart.options.plugins.title.text = $localLang.TIMER.histogram;
    distChart.data.datasets[0].label = $localLang.TIMER.solves;
    distChart.update();

    if ( !$session.settings || $session.settings.sessionType != 'multi-step' || !stepTimeChart || !stepPercentChart ) {
      return;
    }

    stepTimeChart.data.labels = (new Array($session.settings.steps)).fill('').map((e, p) =>
      ($session.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
    );

    // @ts-ignore
    stepTimeChart.options.plugins.title.text = $localLang.TIMER.stepsAverage;
    stepTimeChart.data.datasets[0].label = $localLang.TIMER.average;

    stepPercentChart.data.labels = (new Array($session.settings.steps)).fill('').map((e, p) =>
      ($session.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
    );

    // @ts-ignore
    stepPercentChart.options.plugins.title.text = $localLang.TIMER.stepsPercent;

    stepTimeChart.update();
    stepPercentChart.update();
  }

  function handleResize() {
    [timeChart, hourChart, weekChart].forEach(c => c?.resize());
  }

  function initGraphs(s: any, timerOnly = false) {
    void s; // Just for $solves detection change
    timeChart && timeChart.destroy();
    !timerOnly && hourChart && hourChart.destroy();
    !timerOnly && weekChart && weekChart.destroy();
    !timerOnly && distChart && distChart.destroy();

    const common = {
      showLine: true,
      fill: false,
      tension: .1,
      normalized: true,
    };

    let ctx = chartElement.getContext('2d');

    const shadingArea: Plugin = {
      id: 'shadingArea',
      afterDatasetsDraw(ch) {
        const { ctx, scales: {y} } = ch;
        const { data, hidden } = ch.getDatasetMeta(0);

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
        ctx.fillStyle = '#eefeee33';
        ctx.moveTo(pg1[0], pg1[1]);
        ctx.lineTo(pg2[0], pg2[1]);
        ctx.lineTo(pg3[0], pg3[1]);
        ctx.lineTo(pg4[0], pg4[1]);
        ctx.lineTo(pg1[0], pg1[1]);
        ctx.fill();
        ctx.restore();

      }
    };

    timeChart = new Chart(ctx as any, {
      data: {
        datasets: [
          { data: [], type: 'line', label: 'Trend', borderDash: [5, 5], ...common, indexAxis: 'x', borderColor: BORDER_COLORS[6], backgroundColor: BACKGROUND_COLORS[6] },
          { data: [], type: 'line', label: 'Best', borderDash: [5, 5], ...common, indexAxis: 'x', borderColor: BORDER_COLORS[5], backgroundColor: BACKGROUND_COLORS[5] },
          { data: [], type: 'line', hidden: true, label: 'Ao100', ...common, indexAxis: 'x', borderColor: BORDER_COLORS[4], backgroundColor: BACKGROUND_COLORS[4] },
          { data: [], type: 'line', hidden: true, label: 'Ao50', ...common, indexAxis: 'x', borderColor: BORDER_COLORS[3], backgroundColor: BACKGROUND_COLORS[3] },
          { data: [], type: 'line', hidden: true, label: 'Ao12', ...common, indexAxis: 'x', borderColor: BORDER_COLORS[2], backgroundColor: BACKGROUND_COLORS[2] },
          { data: [], type: 'line', hidden: true, label: 'Ao5', ...common, indexAxis: 'x', borderColor: BORDER_COLORS[1], backgroundColor: BACKGROUND_COLORS[1] },
          { data: [], type: 'line', label: 'Time', ...common, indexAxis: 'x', borderColor: BORDER_COLORS[0], backgroundColor: BACKGROUND_COLORS[0] },
        ],
        labels: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        parsing: false,
        scales: {
          x:{
            type: 'linear',
            ticks: { display: false },
            grid: { display: false },
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: '#555' },
            ticks: {
              callback: (value: string | number) => timer(+value, true, true)
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
                return label + ": " + timer(+yLabel, true, true);
              },
              title: (items) => `${ $localLang.TIMER.solve } #${Math.round(items[0].parsed.x) + 1}`
            }
          },
          zoom: {
            zoom: { wheel: { enabled: true }, mode: 'x', scaleMode: "x" },
            pan: { enabled: true, mode: "x", },
            limits: { x: { min: 0 }, y: { min: 0 } },
          },
          title: { text: "Time distribution", display: !headless, font: { size: $screen.isMobile ? 20 : 30 }, color: '#ddd' },
          decimation: {
            enabled: true,
            algorithm: 'lttb',
            samples: 700,
          },
          legend: {
            labels: {
              boxWidth: $screen.isMobile ? 20 : undefined,
              filter: ({ datasetIndex }: any, { datasets }) => {
                if ( datasetIndex > 0 && !datasets[ datasetIndex ].data.some((e: any) => !!e.y) ) {
                  return false;
                }

                return true;
              }
            },
            reverse: true
          }
        },
      },
      plugins: [ shadingArea ]
    });

    if ( headless || timerOnly ) {
      updateChart($solves);
      return;
    }

    const colors = ['#36a2eb', '#40c883', '#cd69ff' ];
    let ctx2 = chartElement2.getContext('2d') as CanvasRenderingContext2D;
    
    hourChart = new Chart(ctx2 as any, {
      data: {
        datasets: [{
          data: [], label: "Solves", type: 'scatter', showLine: true, tension: .4, fill: true,
          backgroundColor: colors[0] + '22', borderColor: colors[0]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { text: "Hour distribution", display: true, font: { size: 30 }, color: '#ddd' },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {
              label: (context) => {
                let c = context.parsed;
                return `${context.dataset.label}: ${c.y} (${ formatHour(c.x) })`;
              }
            }
          },
        },
        scales: {
          x: {
            min: 0, max: 23,
            ticks: {
              callback: (val) => {
                return formatHour(~~val);
              }
            }
          },
          y: { beginAtZero: true }
        }
      }
    });

    let ctx3 = chartElement3.getContext('2d');

    weekChart = new Chart(ctx3 as any, {
      data: {
        datasets: [{
          data: [], label: "Solves", type: 'line', ...common, tension: .4,
          fill: true, backgroundColor: colors[1] + '22', borderColor: colors[1]
        }],
        labels: DAYS
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest',
            intersect: false,
          },
          title: { text: "Week distribution", display: true, font: { size: 30 }, color: '#ddd' }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
    
    let ctx4 = chartElement4.getContext('2d');

    distChart = new Chart(ctx4 as any, {
      data: {
        datasets: [{
          data: [1, 2, 3, 4, 5], label: "Solves", type: 'bar', backgroundColor: colors[2] + 'aa',
          borderRadius: { topLeft: 7, topRight: 7 }
        }],
        labels: ["A", "B", "C", "D", "E"],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest',
            intersect: false,
          },
          title: { text: "Histogram", display: true, font: { size: 30 }, color: '#ddd' }
        },
        scales: { y: { beginAtZero: true } }
      }
    });

    if ( $session.settings?.sessionType != 'multi-step' ) {
      return;
    }
    
    updateChart($solves);
  }

  async function updateMultiSteps(s: Session) {
    if ( !s.settings || s.settings.sessionType != 'multi-step' ) {
      return;
    }

    await new Promise((res) => {
      let tm = setInterval(() => {
        if ( chartElement5 && chartElement6 ) {
          clearInterval(tm);
          res(null);
        }
      }, 1000);
    });

    if ( stepTimeChart && stepPercentChart ) {
      stepTimeChart.data.datasets[0].data = steps;
      stepTimeChart.data.labels = (new Array(s.settings.steps)).fill('').map((e, p) =>
        (s.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
      );

      stepPercentChart.data.datasets[0].data = calcPercents(steps, $stats.avg.value);
      stepPercentChart.data.labels = (new Array(s.settings.steps)).fill('').map((e, p) =>
        (s.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
      );

      stepTimeChart.update();
      stepPercentChart.update();
      return;
    }

    let ctx5 = chartElement5.getContext('2d');

    stepTimeChart = new Chart(ctx5 as any, {
      data: {
        datasets: [{
          data: steps, label: $localLang.TIMER.average, type: 'bar', backgroundColor: STEP_COLORS,
          borderRadius: { topLeft: 7, topRight: 7 }
        }],
        labels: (new Array(s.settings.steps)).fill('').map((e, p) =>
          (s.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
        ),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: '#555' },
            beginAtZero: true,
            ticks: {
              callback: (value: string | number) => timer(+value, true, true)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label;
                let yLabel = context.parsed.y;
                return label + ": " + timer(+yLabel, true, true);
              },
            }
          },
          title: { text: $localLang.TIMER.stepsAverage, display: true, font: { size: 30 }, color: '#ddd' }
        },
      }
    });

    let ctx6 = chartElement6.getContext('2d');

    let percents = calcPercents(steps, $stats.avg.value);

    // @ts-ignore
    stepPercentChart = new Chart(ctx6 as any, {
      data: {
        datasets: [{
          data: percents, type: 'doughnut',
          backgroundColor: STEP_COLORS,
          borderColor: '#0004'
        }],
        labels: (new Array(s.settings.steps)).fill('').map((e, p) =>
          (s.settings.stepNames || [])[p] || `${ $localLang.global.step } ${p + 1}`
        ),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {
              label: (context) => {
                let label = context.label;
                let yLabel = context.parsed;
                return `${label}: ${yLabel}%`;
              },
            }
          },
          title: { text: $localLang.TIMER.stepsPercent, display: true, font: { size: 30 }, color: '#ddd' }
        },
      }
    });
  }

  onMount(() => {
    Chart.register(zoomPlugin);
    Chart.defaults.color = '#bbbbbb';
    Chart.defaults.font.family = localStorage.getItem('app-font') || 'Ubuntu';
    Chart.overrides.line.spanGaps = true;

    initGraphs([]);
  });

  $: timeChart && initGraphs($solves, true);
  $: $stats && distChart && updateStats();
  $: $localLang, timeChart && updateChartText();
  $: updateMultiSteps($session);

</script>

<svelte:window on:resize={ handleResize } />

<main class:headless class:multi={ $session.settings?.sessionType === 'multi-step' }>
  <div class={`canvas card grid place-items-center
    max-sm:col-span-1 max-sm:row-span-1 sm:row-span-1 col-span-2 md:row-span-2 bg-white bg-opacity-10 rounded-md `
    + (headless ? 'max-md:col-span-full' : '')}>
    <canvas bind:this={ chartElement }></canvas>
  </div>
  <div class={"stats flex card " + (headless ? 'max-md:hidden' : '')}>
    <StatsProgress
      title={ $localLang.TIMER.best } pColor="bg-green-400"
      label={ timer($stats.best.value, true, true) }
      value={ $stats.best.value } total={ $stats.worst.value }/>

    <StatsProgress
      title={ $localLang.TIMER.worst } pColor="bg-orange-400"
      label={ timer($stats.worst.value, true, true) }
      value={ $stats.worst.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title={ $localLang.TIMER.average }
      label={ timer($stats.avg.value, true, true) }
      value={ $stats.avg.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title={ $localLang.TIMER.deviation }
      label={ timer($stats.dev.value, true, true) }
      value={ $stats.dev.value } total={ $stats.worst.value }/>
    
    <StatsProgress
      title={ $localLang.TIMER.totalTime } bgColor="hidden"
      label={ timer($stats.time.value, true, true) }/>
    
    <StatsProgress title={ $localLang.TIMER.count } label={ $stats.count.value.toString() }
      value={ $stats.count.value } total={ $stats.count.value }/>
  </div>

  {#if !headless}
    <div class="card">
      <h2 class="text-3xl text-gray-200 text-center">{ $localLang.TIMER.bestMarks }</h2>
      <div id="best-marks">
        {#each $localLang.TIMER.bestList as ao}  
          <span>{ ao.title }</span>
          <span>{
            $stats[ ao.key ].id
              ? timer( $stats[ ao.key ][ /^(best|worst)$/.test(ao.key) ? 'value' : 'best'] || 0, true, true )
              : ':('
            }</span>
          <span>
            {#if $stats[ ao.key ].id}
              <Button color="green" class="px-4 text-sm h-6" ariaLabel={ $localLang.TIMER.go } on:click={
                () => selectSolveById($stats[ ao.key ].id || '', ao.select )
              }>{ $localLang.TIMER.go }</Button>
            {/if}
          </span>
        {/each}
      </div>
    </div>

    {#if $session.settings?.sessionType === 'multi-step'}
      <div class="steps-graph card">
        <canvas bind:this={ chartElement5 }></canvas>
      </div>

      <div class="steps-percents card">
        <canvas bind:this={ chartElement6 }></canvas>
      </div>
    {/if}

    <div class="hour-distribution card">
      <canvas bind:this={ chartElement2 }></canvas>
    </div>

    <div class="week-distribution card">
      <canvas bind:this={ chartElement3 }></canvas>
    </div>

    <div class="histogram card">
      <canvas bind:this={ chartElement4 }></canvas>
    </div>
  {/if}
</main>

<style lang="postcss">
  main { --rows: 4; }
  
  main.multi {
    --rows: 5;
  }
  
  @media not all and (min-width: 640px) {
    main { --rows: 8; }
  }

  main:not(.headless) {
    @apply w-full overflow-scroll p-4 grid gap-4 grid-rows-5 grid-cols-2
      lg:grid-cols-3 lg:grid-rows-3 max-sm:grid-cols-1;
    max-height: calc(100vh - 8rem);
    grid-template-rows: repeat(var(--rows), minmax(22rem, 1fr));
  }

  main.headless {
    @apply grid grid-cols-3 mx-4 gap-4;
    max-height: calc(40vh);
    grid-template-rows: 1fr 1fr;
  }

  .card {
    @apply text-gray-300 p-6 bg-white bg-opacity-10 rounded-md;
  }

  .stats {
    @apply flex-col items-center justify-between;
  }

  main:not(.headless) .stats {
    @apply row-span-1;
  }

  main.headless .stats {
    @apply row-span-2;
  }

  #best-marks {
    @apply grid gap-y-1;
    grid-template-columns: 1fr 1fr auto;
    width: min(100%, 20rem);
    margin: auto;
  }

  .steps-graph {
    @apply lg:col-span-2;
  }

  .steps-percents {
    color: inherit;
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