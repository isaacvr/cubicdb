<script lang="ts">
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
  import * as echarts from "echarts";
  import ExternalIcon from '@icons/OpenInNew.svelte';

  export let context: TimerContext;
  export let headless = false;

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));
    
  let { solves, stats, session, STATS_WINDOW, selectSolveById } = context;

  let timeSerie: HTMLDivElement;
  let timeChart: echarts.ECharts;
  
  let hourSerie: HTMLDivElement;
  let hourChart: echarts.ECharts;

  let weekSerie: HTMLDivElement;
  let weekChart: echarts.ECharts;

  let distSerie: HTMLDivElement;
  let distChart: echarts.ECharts;

  let stepTimeSerie: HTMLDivElement;
  let stepTimeChart: echarts.ECharts;

  let stepPercentSerie: HTMLDivElement;
  let stepPercentChart: echarts.ECharts;

  const tooltipStyle: echarts.TooltipComponentOption = {
    trigger: 'axis',
    axisPointer: {
      type: 'line',
    },
    textStyle: { color: '#a2a0a0' },
    backgroundColor: '#1c1b2a',
    confine: true,
  };

  const rendererType = 'svg';
  const DAYS = [ "Sun", "Mon", "Tue", "Wen", "Thu", "Fri", "Sat" ];

  let steps: number[] = [];

  function getBest(arr: Solve[], rev?: boolean): number[][] {
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
        bests.push([i, best]);
      }
    }

    return bests;
  }

  function updateChart(sv: Solve[]) {
    const len = sv.length - 1;
    let avgs = [ 5, 12, 50, 100 ];

    // Series
    /// Ao5 to AoX
    let avgSerie: echarts.SeriesOption[] = avgs.map((e, i) => {
      let pos = $AON.indexOf(e);
      let data: any = (pos > -1 && $STATS_WINDOW) ? $STATS_WINDOW[ pos ] : getAverageS(e, sv, $session?.settings?.calcAoX || AverageSetting.SEQUENTIAL);
      return { data, type: 'line', connectNulls: false, name: 'Ao' + e };
    });

    // Best marks
    let bestSerie: echarts.SeriesOption = {
      data: getBest(sv, true),
      type: 'line',
      name: $localLang.TIMER.best,
      clip: false,
      coordinateSystem: 'cartesian2d',
      lineStyle: {
        type: 'dashed'
      }
    };

    // Trend
    let trendSerie: echarts.SeriesOption[] = (() => {
      if ( sv.filter(s => !infinitePenalty(s)).length < 3 ) {
        return [
          { name: $localLang.TIMER.timeChartLabels.slice(-1)[0], data: [], type: 'line' },
          { name: 'trend-low', data: [], type: 'line' },
          { name: 'trend-high', data: [], type: 'line' },
        ];
      }

      const { m, n } = trendLSV(sv.map((s, p) => [len - p, s.time]));
      const nn = $stats.dev.value;

      return [{
        name: $localLang.TIMER.timeChartLabels.slice(-1)[0],
        data: sv.map((_, p) => [len - p, m * (len - p) + n]),
        type: 'line',
        showSymbol: false,
        tooltip: { show: false },
        lineStyle: { type: 'dashed', color: 'white' },
      }, {
        name: 'trend-low',
        data: sv.map((_, p) => [len - p, m * (len - p) + n - nn / 2]),
        type: 'line',
        showSymbol: false,
        stack: 'trend-band',
        lineStyle: { opacity: 0 },
        tooltip: { show: false }
      }, {
        name: 'trend-high',
        data: sv.map((_, p) => [len - p, nn]),
        type: 'line',
        showSymbol: false,
        stack: 'trend-band',
        areaStyle: { color: '#fff4' },
        lineStyle: { opacity: 0 },
        tooltip: { show: false },
      }];
    })();

    // All Series
    let allSeries: echarts.SeriesOption[] = [
      {
        data: sv.map((_, p) => infinitePenalty(sv[len - p]) ? null as any : sv[len - p].time),
        type: "line",
        connectNulls: false,
        name: $localLang.TIMER.timeChartLabels[0],
        smooth: sv.length < 2000
      },
      ...avgSerie, bestSerie, ...trendSerie
    ];

    let options: echarts.EChartsOption = {
      title: [{
        text: $localLang.TIMER.timeDistribution,
        left: 'center',
        textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
      }],
      xAxis: {
        type: 'category',
        data: sv.map((_, p) => p + 1),
      },
      yAxis: {
        type: "value",  min: 'dataMin', max: 'dataMax',
        axisLabel: {
          formatter: (value) => timer(value)
        }
      },
      grid: {
        right: '1%'
      },
      legend: {
        data: $localLang.TIMER.timeChartLabels,
        top: '6%'
      },
      dataZoom: [{
        type: "slider",
        xAxisIndex: [0],
      }, {
        type: 'inside',
        minSpan: 0,
        maxSpan: 100
      }],
      series: allSeries,
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: localStorage.getItem('app-font') || 'Ubuntu'
      },
      tooltip: {
        ...tooltipStyle,
        axisPointer: {
          type: 'cross',
          label: {
            color: tooltipStyle.textStyle?.color,
            backgroundColor: tooltipStyle.backgroundColor,
            borderColor: '#ddff',
            borderWidth: 2,
            formatter({ axisDimension, value }: any) {
              return axisDimension === 'x' ? (+value.toString() + '') : timer(+value.toString(), true, true);
            },
          },
          animation: false,
          animationDurationUpdate: 0
        },
        formatter: function (params: any) {
          let output = params[0].axisValueLabel + '<br/>';
          let pos = +params[0].axisValueLabel;

          output += '<table style="width: 100%;">';

          params.forEach(function (param: any) {
            const value = Array.isArray(param.data) ? param.data[1] : param.data;
            const name: string = param.seriesName;
            
            if ( name.startsWith('Ao') && pos < +(name.slice(2)) ) {
              return;
            }

            output += `<tr>
              <td>${ param.marker}</td>
              <td>${ name }</td>
              <td style="text-align: right; font-weight: bold; padding-left: .5rem;">${ timer(+value, true, true) }</td>
            </tr>`;
          });

          return output + '</table>';
        },
      },
      animation: true,
      animationDuration: 500,
    };

    timeChart.setOption(options);

    timeChart.off('dataZoom');
    timeChart.off('legendselectchanged');
    timeChart.on('dataZoom', function (params: any) {
      let start = Math.round((params.batch ? params.batch[0].start: params.start) * sv.length / 100);
      let end = Math.round((params.batch ? params.batch[0].start: params.start) * sv.length / 100);

      timeChart.setOption({
        series: [{
          smooth: Math.abs(end - start) <= 800
        }, ...avgSerie.map(() => ({
          smooth: Math.abs(end - start) <= 800
        }))]
      });
    });

    timeChart.on('legendselectchanged', function(ev: any) {
      let trendName = $localLang.TIMER.timeChartLabels.slice(-1)[0];
      let hTrend: echarts.LineSeriesOption = allSeries.filter(s => s.name === 'trend-high')[0] as any;

      if ( !ev.selected[ trendName ] ) {
        hTrend.areaStyle!.color = 'transparent';
      } else {
        hTrend.areaStyle!.color = '#fff4';
      }

      timeChart.setOption(options);
    });

    if ( headless ) return;

    // HOUR CHART
    let HData = sv.reduce((acc, s) => {
      acc[ moment(s.date).hour() ] += 1; return acc;
    }, new Array(24).fill(0));

    let hourOptions: echarts.EChartsOption = {
      title: [{
        text: $localLang.TIMER.hourDistribution,
        left: 'center',
        textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
      }],
      xAxis: {
        type: 'category',
        data: HData.map((_, p) => p),
        axisLabel: { formatter(value) { return formatHour(+value) } }
      },
      yAxis: { type: "value",  min: 0, max: 'dataMax', scale: true },
      grid: { right: '1%', bottom: '10%' },
      series: [{
        name: $localLang.TIMER.solves,
        data: HData.map((e, p) => [p, e]),
        type: 'line',
        smooth: true,
        areaStyle: { opacity: .2 },
        color: '#36a2eb'
      }],
      backgroundColor: "transparent",
      textStyle: { fontFamily: localStorage.getItem('app-font') || 'Ubuntu' },
      tooltip: {
        ...tooltipStyle,
        axisPointer: {
          label: {
            formatter({ axisDimension, value }) {
              return axisDimension === 'x' ? formatHour(+value.toString()) : value.toString();
            },
          }
        },
      }
    };

    hourChart.setOption(hourOptions);

    // WEEK CHART
    let WData: number[] = sv.reduce((acc, s) => {
      acc[ moment(s.date).isoWeekday() - 1 ] += 1;
      return acc;
    }, new Array(7).fill(0));

    let weekOptions: echarts.EChartsOption = {
      title: [{
        text: $localLang.TIMER.weekDistribution,
        left: 'center',
        textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
      }],
      xAxis: {
        type: 'category',
        data: DAYS,
      },
      yAxis: { type: "value",  min: 0, max: 'dataMax', scale: true },
      grid: { right: '1%', bottom: '10%' },
      series: [{
        name: $localLang.TIMER.solves,
        data: WData,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: .2 },
        color: '#40c883'
      }],
      backgroundColor: "transparent",
      textStyle: { fontFamily: localStorage.getItem('app-font') || 'Ubuntu' },
      tooltip: {
        ...tooltipStyle
      }
    };

    weekChart.setOption(weekOptions);
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

    let distOption: echarts.EChartsOption = {
      title: [{
        text: $localLang.TIMER.histogram, left: 'center',
        textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
      }],
      xAxis: {
        type: 'category',
        data: itvs.map(a => `${ timer(a[0], true) } - ${ timer(a[1], true) }`),
      },
      yAxis: { type: "value",  min: 0, max: 'dataMax', scale: true },
      grid: { right: '1%', bottom: '10%' },
      series: [{
        name: $localLang.TIMER.solves,
        data: cants,
        type: 'bar',
        color: '#cd69ff',
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
        },
      }],
      backgroundColor: "transparent",
      textStyle: { fontFamily: localStorage.getItem('app-font') || 'Ubuntu' },
      tooltip: { ...tooltipStyle }
    };

    distChart.setOption(distOption);

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

  }

  function updateChartText() {
    timeChart.setOption({
      title: [{ text: $localLang.TIMER.timeDistribution }],
      legend: { data: $localLang.TIMER.timeChartLabels },
      series: $localLang.TIMER.timeChartLabels.map(s => ({ name: s }))
    });
   
    if ( headless ) return;

    hourChart.setOption({
      title: [{ text: $localLang.TIMER.hourDistribution }],
      series: [{ name: $localLang.TIMER.solves }]
    });

    weekChart.setOption({
      title: [{ text: $localLang.TIMER.weekDistribution }],
      series: [{ name: $localLang.TIMER.solves }],
      xAxis: { data: $localLang.TIMER.days },
    });

    distChart.setOption({
      title: [{ text: $localLang.TIMER.histogram }],
      series: [{ name: $localLang.TIMER.solves }],
    });


    if ( !$session.settings || $session.settings.sessionType != 'multi-step' || !stepTimeChart || !stepPercentChart ) {
      return;
    }

    stepTimeChart.setOption({ title: { text: $localLang.TIMER.stepsAverage } });
    stepPercentChart.setOption({ title: { text: $localLang.TIMER.stepsPercent } });

  }

  function handleResize() {
    [timeChart, hourChart, weekChart, distChart, stepTimeChart, stepPercentChart].forEach(c => c?.resize());
  }

  function initGraphs(s: any, timerOnly = false) {
    void s; // Just for $solves detection change

    if ( !timeChart ) {
      timeChart = echarts.init(timeSerie, "dark", { renderer: rendererType });
    }

    if ( headless || timerOnly ) {
      updateChart($solves);
      return;
    }

    if ( !hourChart ) {
      hourChart = echarts.init(hourSerie, "dark", { renderer: rendererType });
    }
    
    if ( !weekChart ) {
      weekChart = echarts.init(weekSerie, "dark", { renderer: rendererType });
    }

    if ( !distChart ) {
      distChart = echarts.init(distSerie, "dark", { renderer: rendererType });
    }
  
    updateChart($solves);
  }

  async function updateMultiSteps(ss: Session) {
    if ( !ss.settings || ss.settings.sessionType != 'multi-step' ) {
      stepTimeChart?.dispose();
      stepPercentChart?.dispose();
      return;
    }

    await new Promise((res) => {
      let tm = setInterval(() => {
        if ( stepPercentSerie && stepTimeSerie ) {
          clearInterval(tm);
          res(null);
        }
      }, 1000);
    });

    if ( stepTimeChart && stepPercentChart && !stepTimeChart.isDisposed() && !stepPercentChart.isDisposed() ) {
      stepTimeChart && !stepTimeChart.isDisposed() && stepTimeChart.setOption({
        xAxis: { data: steps.map((_, p) => (ss.settings.stepNames || [])[p] || `${$localLang.global.step} ${p + 1}`) },
        series: [{ data: steps.map((e, p )=> ({
          value: e,
          itemStyle: { color: STEP_COLORS[p % STEP_COLORS.length] }
        })) }],
      });

      console.log("NEW DATA", stepTimeChart && !stepTimeChart.isDisposed());

      let percents = calcPercents(steps, $stats.avg.value)
      
      stepPercentChart && !stepPercentChart.isDisposed() && stepPercentChart.setOption({
        series: [{ data: percents.map((e, p)=> ({
          value: e,
          name: (ss.settings.stepNames || [])[p] || `${$localLang.global.step} ${p + 1}`,
          itemStyle: { color: STEP_COLORS[p % STEP_COLORS.length] },
        }))}],
      });

      return;
    }

    if ( !stepTimeChart || stepTimeChart.isDisposed() ) {
      stepTimeChart = echarts.init(stepTimeSerie, 'dark', { renderer: rendererType });

      let stepOption: echarts.EChartsOption = {
        title: [{
          text: $localLang.TIMER.stepsAverage, left: 'center',
          textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
        }],
        xAxis: {
          type: 'category',
          data: steps.map((_, p) => (ss.settings.stepNames || [])[p] || `${$localLang.global.step} ${p + 1}`)
        },
        yAxis: { type: "value",  min: 0, max: 'dataMax', scale: true, axisLabel: {
          formatter(v) { return timer(+v.toString(), true); }
        } },
        grid: { right: '1%', bottom: '10%' },
        series: [{
          name: $localLang.global.step,
          data: steps.map((e, p )=> ({
            value: e,
            itemStyle: { color: STEP_COLORS[p % STEP_COLORS.length] }
          })),
          type: 'bar',
          color: '#cd69ff',
          itemStyle: {
            borderRadius: [10, 10, 0, 0],
          },
        }],
        backgroundColor: "transparent",
        textStyle: { fontFamily: localStorage.getItem('app-font') || 'Ubuntu' },
        tooltip: { ...tooltipStyle, valueFormatter(v) { return timer(+(v || '').toString(), true, true); } }
      };

      stepTimeChart.setOption(stepOption);
    }

    if ( !stepPercentChart || stepPercentChart.isDisposed() ) {
      stepPercentChart = echarts.init(stepPercentSerie, 'dark', { renderer: rendererType });

      let percents = calcPercents(steps, $stats.avg.value);

      let stepOption: echarts.EChartsOption = {
        title: [{
          text: $localLang.TIMER.stepsPercent, left: 'center',
          textStyle: { fontSize: $screen.isMobile ? 20 : 30 },
        }],
        series: [{
          name: $localLang.global.step,
          data: percents.map((e, p)=> ({
            value: e,
            name: (ss.settings.stepNames || [])[p] || `${$localLang.global.step} ${p + 1}`,
            itemStyle: { color: STEP_COLORS[p % STEP_COLORS.length] },
          })),
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: { borderRadius: 10, borderWidth: 3, borderColor: '#fff1' },
          top: '4%'
        }],
        backgroundColor: "transparent",
        textStyle: { fontFamily: localStorage.getItem('app-font') || 'Ubuntu', fontSize: 17 },
        tooltip: { ...tooltipStyle, trigger: 'item', valueFormatter(v) { return (v || '').toString() + '%'; } }
      };

      stepPercentChart.setOption(stepOption);
    }
  }

  onMount(() => {
    initGraphs([]);
  });

  $: timeSerie && initGraphs($solves, true);
  $: $stats && distChart && updateStats();
  $: $localLang, timeChart && updateChartText();
  $: updateMultiSteps($session);

</script>

<svelte:window on:resize={ handleResize } />

<main class:headless class:multi={ $session.settings?.sessionType === 'multi-step' }>
  <div class={`canvas card grid place-items-center
    max-sm:col-span-1 col-span-2 row-span-2 bg-white bg-opacity-10 rounded-md `
    + (headless ? 'max-md:col-span-full' : '')} bind:this={ timeSerie }>
  </div>
  <div class={"stats flex card " + (headless ? 'max-md:hidden' : '')}>    
    <StatsProgress
      title={ $localLang.TIMER.best } pColor="green"
      label={ timer($stats.best.value, true, true) }
      value={ $stats.best.value } total={ $stats.worst.value }/>

    <StatsProgress
      title={ $localLang.TIMER.worst } pColor="yellow"
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
    
    <span class="my-1"></span>

    <StatsProgress title={ $localLang.TIMER.count } label={ $stats.count.value.toString() }
      hidebar value={ $stats.count.value } total={ $stats.count.value }/>

    <StatsProgress
      title={ $localLang.TIMER.totalTime } hidebar
      label={ timer($stats.time.value, true, true) }/>
  </div>

  {#if !headless}
    <div class="card">
      <h2 class="text-3xl text-gray-200 text-center mb-4">{ $localLang.TIMER.bestMarks }</h2>
      <div id="best-marks">
        {#each $localLang.TIMER.bestList as ao}
          {#if $stats[ ao.key ].id}
            <span class="flex items-center justify-between px-1 bg-black bg-opacity-40">
              { ao.title }:
              
              <Button color="none" class="px-1 text-sm h-6 hover:text-green-300" ariaLabel={ $localLang.TIMER.go } on:click={
                () => selectSolveById($stats[ ao.key ].id || '', ao.select )
              }>
                { timer( $stats[ ao.key ][ /^(best|worst)$/.test(ao.key) ? 'value' : 'best'] || 0, true, true ) }
                <ExternalIcon />
              </Button>
            </span>
          {/if}
        {/each}
      </div>
    </div>

    {#if $session.settings?.sessionType === 'multi-step'}
      <div class="steps-graph card" bind:this={ stepTimeSerie }></div>
      <div class="steps-percents card" bind:this={ stepPercentSerie }></div>
    {/if}

    <div class="hour-distribution card" bind:this={ hourSerie }></div>
    <div class="week-distribution card" bind:this={ weekSerie }></div>
    <div class="histogram card" bind:this={ distSerie }></div>
  {/if}
</main>

<style lang="postcss">
  @media not all and (min-width: 640px) {
    main { --rows: 7;}
    main.multi { --rows: 9; }
  }
  
  @media (min-width: 640px) {
    main { --rows: 5; }
    main.multi { --rows: 6; }
  }

  @media (min-width: 1024px) {
    main { --rows: 4; }
    main.multi { --rows: 5; }
  }

  main:not(.headless) {
    @apply w-full overflow-x-clip overflow-y-scroll p-4 grid gap-4 grid-cols-2
      lg:grid-cols-3 max-sm:grid-cols-1;
    max-height: calc(100vh - 8rem);
    grid-template-rows: repeat(var(--rows), minmax(17rem, 1fr));
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
    grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
    margin: auto;
    column-gap: 1rem;
    row-gap: .5rem;
  }

  .steps-graph {
    @apply lg:col-span-2;
  }

  .steps-percents {
    @apply grid;
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