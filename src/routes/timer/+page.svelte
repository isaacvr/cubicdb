<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { dataService } from "$lib/data-services/data.service";
  import { BezierSticker } from "@classes/puzzle/BezierSticker";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { roundStickerCorners } from "@classes/puzzle/puzzleUtils";
  import { Vector3D } from "@classes/vector3d";
  import Select from "@components/material/Select.svelte";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { options } from "@cstimer/scramble/scramble";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { map } from "@helpers/math";
  import { decimateN, decimateT } from "@helpers/statistics";
  import { sTime } from "@helpers/timer";
  import type { Session, Solve } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { LayoutGrid, Plus, Table2 } from "lucide-svelte";
  import { onMount } from "svelte";

  const iconSize = "1.2rem";
  const chartSamples = 40;

  let sortBy: "name" = $state("name");
  let sortCmp: "asc" | "desc" = $state("asc");
  let layout: "card" | "table" = $state("card");

  let sessions: Session[] = $state([]);
  let images: string[] = $state([]);
  let sessionMap = $state(new Map<string, string>());
  let sessionAmount = $state(new Map<string, number>());

  function sortSessions() {
    sessions.sort((a, b) => {
      if (sortBy === "name") {
        return sortCmp === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return 0;
    });
  }

  function f(x: number) {
    const pot = 100;
    return Math.floor(x * pot) / pot;
  }

  function getChart(arr: number[]): string {
    if (arr.length === 0) return "";

    let W = arr.length - 1;
    let arrMax = Math.max(...arr);
    let arrMin = Math.min(...arr);
    const mTop = 40;
    const mBottom = 10;
    const maxX = 250;

    let inner = "";

    if (arr.length >= 3) {
      let st = new BezierSticker(
        arr.map(
          (n, p) => new Vector3D(map(p, 0, W, 0, maxX), map(n, arrMin, arrMax, mTop, mBottom), 0)
        )
      );

      let bcs = roundStickerCorners(st, 0.4, 1, 10, true) as BezierSticker;

      inner = bcs.parts
        .slice(0, -1)
        .map(p => {
          if (p instanceof Vector3D) {
            return `L ${p.x} ${p.y}`;
          }

          let a = p.anchors;

          if (a.length === 3) {
            return `Q${f(a[1].x)} ${f(a[1].y)},${f(a[2].x)} ${f(a[2].y)}`;
          }

          return `C${f(a[1].x)} ${f(a[1].y)},${f(a[2].x)} ${f(a[2].y)},${f(a[3].x)} ${f(a[3].x)}`;
        })
        .join(" ");
    } else {
      inner = arr
        .map((v, p) => `L ${f(map(p, 0, W, 0, maxX))} ${f(map(v, arrMin, arrMax, mTop, mBottom))}`)
        .join(" ");
    }

    let d =
      `M-10 70 L -10 ${f(map(arr[0], arrMin, arrMax, mTop, mBottom))}` +
      inner +
      `L ${maxX + 10} ${f(map(arr[W], arrMin, arrMax, mTop, mBottom))} L ${maxX + 10} 70`;

    return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="slice" width="100%" height="100%"
      viewBox="0 0 ${maxX} 50" fill="none" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="stroke-primary">
      <defs>
      <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
        <stop class="stop1" offset="0%" />
        <stop class="stop2" offset="100%" />
      </linearGradient>
      </defs>
      <style>.stop1{ stop-color: oklch(var(--p) / 0.3); } .stop2{ stop-color: transparent; }</style>
      <path d="${d}" style="fill: url(#background);" />
      </svg>`;
  }

  function updateData() {
    $dataService.session.getSessions().then(s => (sessions = s));
    $dataService.solve.getSolves().then(s => {
      let sm: Map<string, Solve[]> = s.reduce((acc, cur) => {
        if (!acc.has(cur.session)) {
          acc.set(cur.session, []);
        }
        acc.get(cur.session).push(cur);
        return acc;
      }, new Map());

      let resSM: Map<string, string> = new Map();
      let resSA: Map<string, number> = new Map();

      for (let [key, value] of sm) {
        value.sort((a, b) => a.date - b.date);
        resSA.set(key, value.length);
        resSM.set(
          key,
          getChart(
            value
              .map(sTime)
              .filter(t => Number.isFinite(t))
              .slice(-chartSamples)
          )
        );
      }

      sessionMap = resSM;
      sessionAmount = resSA;
    });
  }

  onMount(updateData);

  $effect(() => {
    pGenerateCubeBundle(
      sessions.map(s => {
        let opts = options.get(s.settings.mode || "333");
        return opts
          ? new Puzzle({ ...(Array.isArray(opts) ? opts[0] : opts), view: "trans" })
          : new Puzzle({ type: "rubik" });
      }),
      250,
      false,
      false,
      true
    ).then(res => (images = res));
  });

  $effect(() => sortSessions());
</script>

<div class="grid grid-rows-[2rem,1fr] gap-2 w-full h-full p-1">
  <div class="actions flex items-center gap-2">
    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortBy}
      items={[{ value: "name", label: $localLang.global.name }]}
      transform={e => e.value}
      label={e => e.label}
    />

    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortCmp}
      items={[
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ]}
      transform={e => e.value}
      label={e => e.label}
    />

    <div class="join gap-1 bg-base-100 p-1 ml-auto">
      <Button
        size="sm"
        onclick={() => (layout = "card")}
        class={layout === "card" ? "bg-primary" : "shadow-transparent border-transparent"}
      >
        <LayoutGrid size={iconSize} />
      </Button>

      <Button
        size="sm"
        onclick={() => (layout = "table")}
        class={layout === "card" ? "shadow-transparent border-transparent" : "bg-primary"}
      >
        <Table2 size={iconSize} />
      </Button>
    </div>

    <Button>
      <Plus size={iconSize} />
      {$localLang.TIMER.addNewSession}
    </Button>
  </div>

  <ul
    class="content overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]
    grid-rows-[repeat(auto-fit,6.2rem)] gap-2"
  >
    {#each sessions as s, p}
      <li class="h-[6rem]">
        <a
          href="/timer"
          class="btn w-full h-full shaded-card hover:bg-base-100 gap-2 grid grid-cols-[40%,60%]"
        >
          <div class="img">
            <PuzzleImage src={images[p]} />
          </div>
          <div class="session-content grid text-left h-full">
            <span class="text-xs font-light">{s.settings.sessionType}</span>
            <span class="font-normal">{s.name}</span>
            <div class="h-6">
              {@html sessionMap.get(s._id)}
            </div>
            <span class="!text-xs font-light bg-base-100 w-fit px-1 py-0 rounded-sm scale-90">
              {sessionAmount.get(s._id) || 0}
            </span>
          </div>
        </a>
      </li>
    {/each}
  </ul>
</div>
