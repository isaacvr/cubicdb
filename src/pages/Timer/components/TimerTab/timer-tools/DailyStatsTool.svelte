<script lang="ts">
  import Select from "@material/Select.svelte";
  import type { Solve, TimerContext } from "@interfaces";
  import moment from "moment";
  import * as echarts from "echarts";
  import { localLang } from "@stores/language.service";
  import { infinitePenalty, sTime, sTimer, timer } from "@helpers/timer";
  import { onMount } from "svelte";

  export let context: TimerContext;

  const { solves } = context;
  const periods = ["Day", "Week", "Month"];

  let period = periods[0];
  let total = 0;
  let mounted = false;

  let timeSerie: HTMLDivElement;
  let timeChart: echarts.ECharts;

  function updateStats(sv: Solve[]) {
    let refUnit = ["days", "weeks", "months"][periods.indexOf(period)];
    let filteredSv = sv.filter(s => ~~(moment().diff(moment(s.date), refUnit as any) < 1));
    let len = filteredSv.length - 1;

    total = filteredSv.length;

    timeSerie.style.height = total === 0 ? "0" : "10rem";

    let series: echarts.SeriesOption[] = [
      {
        data: filteredSv.map((_, p) =>
          infinitePenalty(filteredSv[len - p]) ? (null as any) : sTime(filteredSv[len - p])
        ),
        type: "line",
        connectNulls: false,
        name: $localLang.TIMER.timeChartLabels[0],
        smooth: filteredSv.length < 2000,
      },
    ];

    let options: echarts.EChartsOption = {
      xAxis: {
        type: "category",
        data: filteredSv.map((_, p) => p + 1),
      },
      yAxis: {
        type: "value",
        min: "dataMin",
        max: "dataMax",
        axisLabel: {
          formatter: value => timer(value),
        },
      },
      grid: {
        right: "1%",
        top: "4%",
      },
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: [0],
        },
        {
          type: "inside",
          minSpan: 0,
          maxSpan: 100,
        },
      ],
      series,
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: localStorage.getItem("app-font") || "Ubuntu",
      },
      tooltip: {
        confine: true,
        trigger: "axis",
        textStyle: { color: "#a2a0a0" },
        backgroundColor: "#1c1b2a",
        axisPointer: {
          type: "cross",
          label: {
            color: "#a2a0a0",
            backgroundColor: "#1c1b2a",
            borderColor: "#ddff",
            borderWidth: 2,
            formatter({ axisDimension, value }: any) {
              return axisDimension === "x"
                ? +value.toString() + ""
                : timer(+value.toString(), true, true);
            },
          },
          animation: false,
          animationDurationUpdate: 0,
        },
        formatter: function (params: any) {
          let output = params[0].axisValueLabel + "<br/>";
          let pos = +params[0].axisValueLabel;

          output += '<table style="width: 100%;">';

          params.forEach(function (param: any) {
            const value = Array.isArray(param.data) ? param.data[1] : param.data;
            const name: string = param.seriesName;

            if (name.startsWith("Ao") && pos < +name.slice(2)) {
              return;
            }

            output += `<tr>
              <td>${param.marker}</td>
              <td>${name}</td>
              <td style="text-align: right; font-weight: bold; padding-left: .5rem;">${timer(+value, true, true)}</td>
            </tr>`;
          });

          return output + "</table>";
        },
      },
      animation: true,
      animationDuration: 500,
    };

    timeChart.setOption(options);
    timeChart.resize();

    timeChart.off("dataZoom");
    timeChart.off("legendselectchanged");
    timeChart.on("dataZoom", function (params: any) {
      let start = Math.round(
        ((params.batch ? params.batch[0].start : params.start) * filteredSv.length) / 100
      );
      let end = Math.round(
        ((params.batch ? params.batch[0].start : params.start) * filteredSv.length) / 100
      );

      timeChart.setOption({
        series: [
          {
            smooth: Math.abs(end - start) <= 800,
          },
        ],
      });
    });
  }

  onMount(() => {
    mounted = true;

    timeChart = echarts.init(timeSerie, "dark", { renderer: "svg" });
  });

  $: mounted && $solves && period && updateStats($solves);
</script>

<div class="grid place-items-center gap-2">
  <div class="flex justify-center items-center gap-2">
    Period:
    <Select
      class="py-2 !bg-gray-800"
      placement="right"
      items={periods}
      bind:value={period}
      transform={e => e}
    />
    <span> Solves: {total}</span>
  </div>

  <div class="w-full overflow-hidden" bind:this={timeSerie}></div>

  <span>Last 5 solves</span>

  <ul class="flex gap-2">
    {#each $solves.slice(0, 5) as sv, p}
      <li class={"bg-gray-800 p-1 rounded-md " + (p === 0 ? "bg-red-300 text-black" : "")}>
        {sTimer(sv, true)}
      </li>
    {/each}
  </ul>
</div>
