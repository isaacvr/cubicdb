<script lang="ts">
  import timer from '@helpers/timer';
  import { AverageSetting, Penalty, type Solve } from '@interfaces';
  import Chart from 'chart.js/auto';
  import { onMount } from 'svelte';

  export let context;

  let { solves, AoX } = context;
  
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
        bests.push({ x: i.toString(), y: best });
      }
    }

    return bests;
  }

  function updateChart(sv: Solve[]) {
    const len = sv.length - 1;

    /// Regular solves
    chart.data.datasets[0].data = <any> sv.map((e, p) => ({x: p.toString(), y: sv[len - p].time }));
      
    let avgs = [ 5, 12, 50, $AoX ];

    /// Ao5 to AoX
    avgs.forEach((e, i) => {
      chart.data.datasets[i + 1].data = <any> getAverage(e, sv, calcAoX).map((e, p) => ({ x: p.toString(), y: e }));
      chart.data.datasets[i + 1].label = 'Ao' + e;
    });
    
    /// Best solves
    chart.data.datasets[5].data = getBest(sv, true);
    
    /// Least square
    const lsqr = sv.reduce((acc, y, x) => [acc[0] + x, acc[1] + y.time, acc[2] + x ** 2, acc[3] + x * y.time], [0, 0, 0, 0]);
    const m = ( (len + 1) * lsqr[3] - lsqr[0] * lsqr[1] ) / ( (len + 1) * lsqr[2] - lsqr[0] ** 2 );
    const n = (lsqr[1] - m * lsqr[0]) / (len + 1);
    chart.data.datasets[6].data = <any>[{ x: "0", y: n }, { x: len.toString(), y: m * len + n }];
    
    chart.update();
  }

  onMount(() => {
    const common = {
      showLine: true,
      fill: false,
      tension: .1,
      xAxisID: 'xAxis',
      yAxisID: 'yAxis',
    };

    ctx = chartElement.getContext('2d');
    
    Chart.defaults.color = '#bbbbbb';

    chart = new Chart(ctx, {
      type: 'line',
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
          xAxis:{
            ticks: { display: false },
            grid: { display: false },
          },
          yAxis: {
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
          }
        }
      }
    });

    updateChart($solves);

  });

  $: chart && updateChart($solves);
  $: $AoX && chart && updateChart($solves);

</script>

<canvas bind:this={ chartElement }></canvas>