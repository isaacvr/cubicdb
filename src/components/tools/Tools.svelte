<script lang="ts">
  import { onMount } from "svelte";
  import { derived, writable, type Readable } from "svelte/store";
  import Select from "@material/Select.svelte";
  import Timer from "@components/timer/Timer.svelte";
  import { Penalty, type Language, type Solve, type TimerContext, type Session, type Statistics, MetricList, type TurnMetric } from "@interfaces";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { STANDARD_PALETTE, SessionDefaultSettings, type SCRAMBLE_MENU, AON, PRINTABLE_PALETTE } from "@constants";
  import * as all from "@cstimer/scramble";
  import Button from "@material/Button.svelte";
  import Input from "@material/Input.svelte";
  import Tooltip from "@material/Tooltip.svelte";
  import CopyIcon from "@icons/ContentCopy.svelte";
  import DownArrowIcon from "@icons/ArrowDown.svelte";
  import { copyToClipboard, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import { sTimer, timerToMilli } from "@helpers/timer";
  import StatsTab from "@components/timer/StatsTab.svelte";
  import { INITIAL_STATISTICS, computeMoves, getUpdatedStatistics } from "@helpers/statistics";
  import TextArea from "@material/TextArea.svelte";
  import { solvFacelet } from "@cstimer/scramble/scramble_333";
  import Mosaic from "./Mosaic.svelte";

  let MENU: SCRAMBLE_MENU[] = getLanguage($globalLang).MENU;
  let groups: string[] = [];
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    let l = getLanguage( $lang );
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    return l;
  });

  let notification = NotificationService.getInstance();

  // Context
  let solves = writable<Solve[]>([]);
  let session = writable<Session>({
    _id: '',
    name: 'Default',
    settings: Object.assign({}, SessionDefaultSettings),
    editing: false,
    tName: '',
  });
  let AoX = writable<number>(100);
  let stats = writable<Statistics>(INITIAL_STATISTICS);
  let group = writable<number>(0);
  let mode = writable<{ 0: string, 1: string, 2: number }>( MENU[0][1][0] );
  let prob = writable<number>();

  // Timer and Scramble Only
  let modes: { 0: string; 1: string; 2: number }[] = [];
  let filters: string[] = [];
  let selectedOption = "timer-only";
  let timer: Timer;

  // Batch
  let batch = 5;
  let scrambleBatch: string[] = [];

  // Statistics
  let timeStr = "";
  let metricString = "";
  let selectedMetric: TurnMetric = 'ETM';
  let moves = 0;
  let metricDetails: any[][];

  const TIMER_DIGITS = /^\d+$/;
  const TIMER_DNF = /^\s*dnf\s*$/i;
  const TIMER_DNS = /^\s*dns\s*$/i;
  const faces = [
    ['0', 'cube-u'],
    ['4', 'cube-l'],
    ['2', 'cube-f'],
    ['1', 'cube-r'],
    ['5', 'cube-b'],
    ['3', 'cube-d']
  ];

  // Solver
  // UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
  const fMap = "URFDLB";
  let colors = STANDARD_PALETTE;
  const DEFAULT_COLOR = colors.gray;
  let fColors = [ colors.w, colors.r, colors.g, colors.y, colors.o, colors.b ];
  let facelets: string[][] = [
    ...[0, 1, 2, 3, 4, 5].map(n => [ '-', '-', '-', '-', fColors[n], '-', '-', '-', '-' ])
  ];

  let keys = [ "[W]", "[R]", "[G]", "[Y]", "[O]", "[B]" ];
  let color = 0;
  let md = false;

  function selectedGroup() {
    modes = MENU[ $group ][1];
    $mode = modes[0];
    selectedMode();
  }

  function selectedMode() {
    filters = all.pScramble.filters.get( $mode[1] ) || [];
    $prob = -1;
  }

  function checkMode(s: string, list: string[]) {
    return list.some((l) => l === s);
  }

  function generateBatch() {
    scrambleBatch.length = 0;

    for (let i = 0; i < batch; i += 1) {
      scrambleBatch.push(
        (all.pScramble.scramblers.get( $mode[1] ) as any)
          .apply(null, [
            $mode[1],
            Math.abs( $mode[2] ),
            $prob < 0 ? undefined : prob,
          ])
          .replace(/\\n/g, "<br>")
          .trim()
      );
    }
  }

  function toClipboard() {
    let str =
      `${ $localLang.TOOLS.cubedbBatch } (${batch})\n\n` +
      scrambleBatch.map((s, p) => `${p + 1}- ${s}`).join("\n\n");

    copyToClipboard(str).then(() => {
      notification.addNotification({
        key: randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000,
      });
    });
  }

  function addTimeString() {
    if ( [TIMER_DIGITS, TIMER_DNF, TIMER_DNS ].every(r => !r.test(timeStr)) ) {
      timeStr = "";
      return;
    }

    let time = 0;
    let penalty = Penalty.NONE;

    if (TIMER_DIGITS.test(timeStr)) {
      time = timerToMilli(+timeStr);
    } else if (TIMER_DNF.test(timeStr)) {
      penalty = Penalty.DNF;
    } else if (TIMER_DNS.test(timeStr)) {
      penalty = Penalty.DNS;
    }

    $solves = [
      {
        date: Date.now(),
        penalty,
        scramble: "",
        selected: false,
        session: "",
        time,
        _id: randomUUID(),
      },
      ...$solves,
    ];

    $stats = getUpdatedStatistics($stats, $solves, $session, $AON).stats;

    timeStr = "";
  }

  function clear() {
    $solves.length = 0;
    $stats = getUpdatedStatistics($stats, $solves, $session, $AON).stats;
  }

  function validTimeStr(t: string): boolean {
    return [TIMER_DIGITS, TIMER_DNS, TIMER_DNF].some(r => r.test(t)) || t === "";
  }
  
  function updateMetrics(ms: string, sm: TurnMetric) {
    let res = computeMoves(ms, sm);

    moves = res.moves;
    metricDetails = res.values;
  }

  function getDescription(toolsMap: any, mt: string) {
    return toolsMap[ mt ];
  }

  function getFacelets() {
    return facelets.map( face => face.map( fc => fc === '-' ? '-' : fMap[ fColors.indexOf(fc as any) ]).join('') ).join('');
  }

  function solve() {
    let fc = getFacelets();
    let res = solvFacelet( fc );
    let header = $localLang.TOOLS.error;
    let text = '';

    switch(res) {
      case 'Error 1': {
        text = $localLang.TOOLS.invalidCube;
        break;
      }
      case 'Error 2': {
        text = $localLang.TOOLS.missingEdges;
        break;
      }
      case 'Error 3': {
        text = $localLang.TOOLS.flippedEdge;
        break;
      }
      case 'Error 4': {
        text = $localLang.TOOLS.missingCorners;
        break;
      }
      case 'Error 5': {
        text = $localLang.TOOLS.twistedCornerClockwise;
        break;
      }
      case 'Error 6': {
        text = $localLang.TOOLS.twistedCornerCounterclockwise;
        break;
      }
      case 'Error 7': {
        text = $localLang.TOOLS.parity;
        break;
      }
      default: {
        header = $localLang.TOOLS.solutionFound;
        text = res;
      }
    }

    notification.addNotification({
      key: randomUUID(),
      header,
      html: `
        ${ header != $localLang.TOOLS.error
            ? `<br><i style="color: #e5c700;">${ $localLang.TOOLS.solutionInstruction }</i><br><br>` : '' }
        ${ text }
      `,
      text: '',
      fixed: true,
      actions: [{ text: $localLang.global.done, callback: () => {} }]
    });
  }

  function fromFacelet(f: string) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 9; j += 1) {
        facelets[i][j] = fColors[ fMap.indexOf( f[ i * 9 + j ] ) ];
      }
    }
  }

  function clearCube() {
    facelets = [
      ...[0, 1, 2, 3, 4, 5].map(n => [ '-', '-', '-', '-', fColors[n], '-', '-', '-', '-' ])
    ];
  }

  function handleKeyup(e: KeyboardEvent) {
    if ( selectedOption === 'solver' ) {
      e.key === 'w' && (color = 0);
      e.key === 'r' && (color = 1);
      e.key === 'g' && (color = 2);
      e.key === 'y' && (color = 3);
      e.key === 'o' && (color = 4);
      e.key === 'b' && (color = 5);
    }
  }

  function assignColor(x: number, y: number) {
    if ( y === 4 ) return;
    facelets[x][y] = fColors[ color ];
  }

  onMount(() => {
    selectedGroup();
    // fromFacelet('UBBLURBBRFDUURDDDLDUURFFFULRRBFDFLLDLURDLFFLDRRBLBBFBU');
  });

  let context: TimerContext = {
    solves, AoX, stats, session
  } as TimerContext;

  $: updateMetrics(metricString, selectedMetric);
</script>

<svelte:window on:keyup={ handleKeyup } on:mousedown={ () => md = true } on:mouseup={ () => md = false }/>

<!-- Selection -->
<div class="flex flex-wrap items-center justify-center gap-2">
  <Select
    items={[
      [$localLang.TOOLS.timerOnly, "timer-only"],
      [$localLang.TOOLS.scrambleOnly, "scramble-only"],
      [$localLang.TOOLS.batchScramble, "scramble-batch"],
      [$localLang.TOOLS.statistics, "statistics"],
      [$localLang.TOOLS.metrics, "metrics"],
      [$localLang.TOOLS.solver, "solver"],
      [$localLang.TOOLS.mosaic, "mosaic"],
    ]}
    label={(e) => e[0]}
    transform={(e) => e[1]}
    bind:value={ selectedOption }
  />

  {#if checkMode(selectedOption, ["scramble-only", "scramble-batch"])}
    <Select
      class="min-w-[8rem]"
      placeholder={$localLang.TIMER.selectGroup}
      value={groups[$group]}
      items={groups}
      transform={(e) => e}
      onChange={(g, p) => {
        $group = p || 0;
        selectedGroup();
      }}
    />

    <Select
      class="min-w-[8rem]"
      placeholder={[$localLang.TIMER.selectMode]}
      value={ $mode }
      items={ modes }
      label={(e) => e[0]}
      transform={(e) => e}
      onChange={(g) => {
        $mode = g;
        selectedMode();
      }}
    />

    {#if filters.length > 0}
      <Select
        class="min-w-[8rem]"
        placeholder={$localLang.TIMER.selectFilter}
        value={prob}
        items={filters}
        label={(e) => e.toUpperCase()}
        transform={(i, p) => p}
        onChange={(i, p) => {
          $prob = p || 0;
        }}
      />
    {/if}
  {/if}

  {#if checkMode(selectedOption, ['metrics'])}
    <Select items={ MetricList } label={ e => e[0] } transform={ e => e[1] } bind:value={ selectedMetric }/>
  {/if}

  <!-- Refresh scramble -->
  {#if checkMode(selectedOption, ['scramble-only'])}
    <Button class="bg-purple-700 text-gray-300" on:click={ () => timer?.initScrambler() }>
      { $localLang.global.refresh }
    </Button>
  {/if}
</div>

{#if checkMode(selectedOption, ["timer-only", "scramble-only"])}
  <Timer
    bind:this={timer}
    timerOnly={selectedOption === "timer-only"}
    scrambleOnly={selectedOption === "scramble-only"}
    useMode={ $mode[1] }
    useLen={ $mode[2] }
    useProb={ $prob }
  />
{:else if checkMode(selectedOption, ["scramble-batch"])}
  {#if scrambleBatch.length}
    <div
      class="container-mini bg-white bg-opacity-10 mx-auto max-w-[calc(min(100%-2rem,100ch))] mt-4
        w-max mb-0 p-4 rounded-md shadow-md text-center"
    >
      <ul class="text-gray-400 grid gap-2 max-h-[calc(100vh-25rem)] overflow-auto">
        {#each scrambleBatch as scr, pos}
          <li>{pos + 1}- {scr}</li>
        {/each}
      </ul>

      <div class="flex gap-2 items-center justify-center">
        <Tooltip
          class="cursor-pointer transition-all duration-200
        hover:text-purple-300 text-gray-400"
          position="bottom"
          text="Copy"
          on:click={toClipboard}
        >
          <CopyIcon size="1.2rem" />
        </Tooltip>
      </div>
    </div>
  {/if}

  <div class="flex items-center justify-center gap-2 mt-8">
    <Input type="number" class="!w-20" bind:value={batch} min={1} on:UENTER={generateBatch} />
    <Button class="bg-purple-700 text-gray-300" on:click={generateBatch}
      >{ $localLang.global.generate }</Button
    >
  </div>
{:else if checkMode(selectedOption, ["statistics"])}

  <div class="mt-4">
    <StatsTab { context } headless/>
  </div>

  <hr class="border-gray-200 w-full mt-2"/>

  <div id="grid" class="text-gray-400 gap-2 mx-8 my-4 grid max-h-[15rem] overflow-x-hidden overflow-y-auto">
    {#each $solves as _, p}
      <Tooltip text={ $localLang.TOOLS.clickToDelete } position="top">
        <button
          class="shadow-md w-24 h-12 rounded-md p-1 bg-white bg-opacity-10 relative
            flex items-center justify-center transition-all duration-200 select-none cursor-pointer
    
            hover:shadow-lg hover:bg-opacity-20
          "
          on:click={ () => $solves = $solves.filter(s => s != $solves[$solves.length - p - 1]) }
        >
          <span class="text-center font-bold">{sTimer($solves[$solves.length - p - 1], true)}</span>
        </button>
      </Tooltip>
    {/each}
  </div>

  <hr class="border-gray-200 w-full mb-2"/>

  <div class="w-[min(100%,30rem)] grid grid-cols-1 gap-2 mx-auto max-md:place-items-center">
    <i class="text-yellow-500 flex items-center gap-2 justify-start">{ $localLang.TOOLS.writeYourTime }<DownArrowIcon size="1.2rem"/> </i>
    <div class="flex max-md:grid max-md:w-[min(90%,20rem)] items-center gap-2">
      <Input focus={ true } bind:value={timeStr} stopKeyupPropagation on:UENTER={ addTimeString }
        class="w-full text-8xl mx-auto !h-24 text-center {validTimeStr(timeStr)
          ? '' : '!border-red-400 !border-2'}
          focus-within:shadow-black"
        inpClass="text-center"
      />
      <Button class="h-min bg-purple-700 text-gray-300" on:click={ addTimeString }>{ $localLang.global.add }</Button>
      <Button class="h-min bg-red-700 text-gray-300" on:click={ clear }>{ $localLang.global.clear }</Button>
    </div>
  </div>
{:else if checkMode(selectedOption, ['metrics'])}
  <div class="mt-8 grid text-center max-w-[50rem] mx-auto">
    <p class="note mb-8">{ getDescription($localLang.TOOLS, selectedMetric) }</p>

    <span>Moves: { moves }</span>

    <ul class="flex gap-2 py-8">
      {#each metricDetails as md}
        <li class="bg-green-800 rounded-md p-2">{ md[0] }: { md[1] }</li>
      {/each}
    </ul>

    <i class="text-yellow-500 flex items-center gap-2 justify-center">
      { $localLang.TOOLS.writeYourScramble }<DownArrowIcon size="1.2rem"/>
    </i>

    <TextArea bind:value={ metricString } class="bg-white bg-opacity-10 w-full" />
  </div>
{:else if checkMode(selectedOption, ['solver'])}
  <h2 class="text-2xl text-center mt-4">{ $localLang.TOOLS.colors }</h2>
  <div class="colors">
    {#each fColors as f, p}
      <Tooltip position="bottom" text={ keys[p] } hasKeybinding>
        <button class="color" on:click={ () => color = p } class:selected={ p === color } style={ `background-color: ${f}` }></button>
      </Tooltip>
    {/each}

    <Button on:click={ solve } class="ml-4 bg-purple-700 text-gray-300">{ $localLang.TOOLS.solve }</Button>
    <Button on:click={ clearCube } class="bg-red-700 text-gray-300">{ $localLang.global.clear }</Button>
  </div>  
  
  <h2 class="text-2xl text-center mt-4">{ $localLang.TOOLS.stickers }</h2>

  <div class="cube-grid">
    {#each faces as face}
      <div class={ face[1] }>
        {#each facelets[ +face[0] ] as f, p}
          <button class="facelet" style={ `background-color: ${(f === '-' ? DEFAULT_COLOR : f)}` }
            on:click={ () => assignColor(+face[0], p) }
            on:mousemove={ () => md && facelets[+face[0]][p] != fColors[color] && assignColor(+face[0], p) }
          ></button>
        {/each}
      </div>
    {/each}
  </div>
{:else if checkMode(selectedOption, ['mosaic'])}
  <Mosaic />
{/if}

<style>
  #grid {
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  }

  .colors {
    display: flex;
    margin: 1rem auto;
    gap: .5rem;
    justify-content: center;
    cursor: pointer;
  }

  .colors .color {
    width: 3rem;
    height: 3rem;
    border-radius: .3rem;
    border: .15rem solid black;
  }

  .colors .color.selected {
    box-shadow: 0px 0px .5rem rgb(250, 222, 152);
  }

  .cube-grid {
    --order: 3;
    display: grid;
    grid-template-areas:
      ". u . ."
      "l f r b"
      ". d . .";
    max-width: 40rem;
    margin: 1rem auto;
    gap: 1rem;
  }

  .cube-grid [class*=cube-] {
    display: grid;
    grid-template-columns: repeat(var(--order), 1fr);
    grid-template-rows: repeat(var(--order), 1fr);
    gap: .2rem;
  }

  .cube-grid .cube-u {
    grid-area: u;
  }

  .cube-grid .cube-l {
    grid-area: l;
  }

  .cube-grid .cube-f {
    grid-area: f;
  }

  .cube-grid .cube-r {
    grid-area: r;
  }

  .cube-grid .cube-b {
    grid-area: b;
  }

  .cube-grid .cube-d {
    grid-area: d;
  }

  .cube-grid .facelet {
    aspect-ratio: 1 / 1;
    border-radius: .3rem;
    border: .15rem solid black;
    cursor: pointer;
  }
</style>