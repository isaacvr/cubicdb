<script lang="ts">
  import Chart, { type Plugin } from 'chart.js/auto';
  import zoomPlugin from 'chartjs-plugin-zoom';
  import { evalLine, map, rotatePoint, rotateSegment } from '@helpers/math';
  import { trendLSV } from '@helpers/statistics';
  import timer from '@helpers/timer';
  import { AverageSetting, Penalty, type Solve, type TimerContext } from '@interfaces';
  import { onMount } from 'svelte';

  export let context: TimerContext;

  let { solves, AoX, stats } = context;
  
  const calcAoX = AverageSetting.SEQUENTIAL;
  let chartElement: HTMLCanvasElement;
  let ctx;
  let chart: Chart;

  function getAverage(n: number, arr: Solve[], calc: AverageSetting): number[] {
    let res: number[] = [];
    let len = arr.length - 1;
    let elems = [];
    let disc = (n === 3) ? 0 : Math.ceil(n * 0.05);
 
    for (let i = 0, maxi = len; i <= maxi; i += 1) {
      if ( arr[len - i].penalty === Penalty.DNF ) {
        res.push(null);
        continue;
      }

      elems.push( arr[len - i].time );
      if ( elems.length < n ) {
        res.push(null);
      } else {
        let e1 = elems.map(e => e).sort((a, b) => a - b);
        let sumd = e1.reduce((s, e, p) => {
          return (p >= disc && p < n - disc) ? s + e : s;
        }, 0);
        
        res.push(sumd / (n - disc * 2));

        calc === AverageSetting.GROUP && (elems.length = 0);
        calc === AverageSetting.SEQUENTIAL && elems.shift();
      }
    }

    return res;
  }

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

    /// Regular solves
    // chart.data.datasets[0].data = sv.map((e, p) => ({x: p, y: sv[len - p].time }));
    // chart.data.datasets[0].data = sv.map((e, p) => sv[len - p].time);
    chart.data.datasets[0].data.length = 0;
    chart.data.datasets[0].data = sv.map((e, p) => [p, sv[len - p].time]);
    chart.options.plugins.zoom.limits.x.max = len + 1;
    
    let avgs = [ 5, 12, 50, $AoX ];

    /// Ao5 to AoX
    avgs.forEach((e, i) => {
      chart.data.datasets[i + 1].data.length = 0;
      chart.data.datasets[i + 1].data = getAverage(e, sv, calcAoX).map((e, p) => ({ x: p, y: e }));
      chart.data.datasets[i + 1].label = 'Ao' + e;
    });
    
    /// Best solves
    chart.data.datasets[5].data.length = 0;
    chart.data.datasets[5].data = getBest(sv, true);

    /// Least square
    const { m, n } = trendLSV(sv.map((s, p) => [len - p, s.time]));
    chart.data.datasets[6].data.length = 0;
    chart.data.datasets[6].data = <any>[{ x: 0, y: n }, { x: len, y: m * len + n }];
    chart.update();
  }

  onMount(() => {
    const common = {
      showLine: true,
      fill: false,
      tension: .1,
      xAxisID: 'x',
      yAxisID: 'y',
    };

    ctx = chartElement.getContext('2d');
    
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

    chart = new Chart(ctx, {
      data: {
        datasets: [
          { data: [], type: 'scatter', label: 'Time', ...common },
          { data: [], type: 'scatter', hidden: true, label: 'Ao5', ...common },
          { data: [], type: 'scatter', hidden: true, label: 'Ao12', ...common },
          { data: [], type: 'scatter', hidden: true, label: 'Ao50', ...common },
          { data: [], type: 'scatter', hidden: true, label: 'AoX', ...common },
          { data: [], type: 'scatter', label: 'Best', borderDash: [5, 5], ...common },
          { data: [], type: 'scatter', label: 'Trend', borderDash: [5, 5], ...common,  },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x:{
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
              title: (items) => `Solve #${items[0].parsed.x + 1}`
            }
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true
              },
              mode: 'x',
              scaleMode: "x",
            },
            pan: {
              enabled: true,
              mode: "x",
            },
            limits: {
              x: { min: 1, max: 40 },
            },
          }
        }
      },//*/
      plugins: [ shadingArea ],
    });

    updateChart($solves);

  });

  $: chart && updateChart($solves);
  $: $AoX && chart && updateChart($solves);

</script>

<canvas bind:this={ chartElement }></canvas>